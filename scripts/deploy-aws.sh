#!/usr/bin/env bash
# Builds the web image, pushes it to ECR, and deploys infra/cloudformation.yml.
# Requires AWS CLI credentials and Docker. The Gemini key is read from apps/web/.env.local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-us-east-1}"
STACK="${STACK_NAME:-formpilot-prod}"
ENV_FILE="$ROOT/apps/web/.env.local"

if ! command -v aws >/dev/null || ! command -v docker >/dev/null; then
  echo "aws CLI and docker are required." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.example and set GEMINI_API_KEY." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "GEMINI_API_KEY is empty in $ENV_FILE." >&2
  exit 1
fi

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
echo "Deploying $STACK in $REGION as account $ACCOUNT"

deploy_stack() {
  aws cloudformation deploy \
    --region "$REGION" \
    --stack-name "$STACK" \
    --template-file "$ROOT/infra/cloudformation.yml" \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides "GeminiApiKey=$GEMINI_API_KEY" "ImageTag=latest" "DesiredCount=$1" "DbEngineVersion=16.15"
}

echo "Creating the network, database, and registry before any task starts"
deploy_stack 0

REPO="$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='RepositoryUri'].OutputValue" --output text)"
CLUSTER="$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ClusterName'].OutputValue" --output text)"
SERVICE="$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ServiceName'].OutputValue" --output text)"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
docker build --platform linux/amd64 -t "$REPO:latest" "$ROOT"
docker push "$REPO:latest"

echo "Starting the web tasks"
deploy_stack 2
aws ecs update-service --region "$REGION" --cluster "$CLUSTER" --service "$SERVICE" --force-new-deployment >/dev/null

aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='Url'].OutputValue" --output text
