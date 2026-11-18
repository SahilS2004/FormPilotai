# Production on AWS

The default agent is the free **Gemini 3 Flash** model. If that model is busy or out of free requests, the server tries Gemini 3.5 Flash, then other free Flash models. Embeddings use Gemini Embedding 2. The container does not run a local model.

## Setup steps

1. Create an AWS account and turn on billing. The template builds a NAT gateway, a Multi-AZ `db.r6g.large` database, and two Fargate tasks, so this is not a free-tier stack.
2. In IAM, create a user (or use a role) that can create VPC, NAT, security groups, ECS, ECR, RDS, S3, Secrets Manager, the load balancer, CloudWatch logs, IAM roles, and Application Auto Scaling.
3. Install the AWS CLI and Docker on this machine.
4. Sign in locally. Do not paste the keys into chat.

   ```bash
   aws configure
   ```

   Use region `us-east-1` unless you pick another region with at least two availability zones.
5. Confirm the identity:

   ```bash
   aws sts get-caller-identity
   ```

6. From the project root, deploy. The script reads `GEMINI_API_KEY` from `apps/web/.env.local`, creates the stack, builds the image, and pushes it to ECR. The first run usually takes 20–30 minutes because RDS and the NAT gateway are slow.

   ```bash
   chmod +x scripts/deploy-aws.sh
   AWS_REGION=us-east-1 ./scripts/deploy-aws.sh
   ```

7. Open the URL the script prints. It is the load balancer address, served over HTTP until you add a certificate.
8. Optional HTTPS: request a public certificate in ACM in the same region, then deploy again with `CertificateArn=arn:aws:acm:...`. Point the domain’s DNS at the load balancer.
9. After the site is healthy, deploy once more with `DeletionProtection=true` so the database cannot be deleted by accident. Keep the other parameter values from the first deploy.

The stack creates the network, database, bucket, cluster, and secret. Those do not need to exist first.

| Piece | Size |
| --- | --- |
| Web tasks | Fargate, 2 vCPU, 4 GB, 2 tasks, scale to 6 |
| Database | RDS PostgreSQL 16, `db.r6g.large`, 100 GB gp3, Multi-AZ, encrypted, 7-day backups |
| Files | Private encrypted S3 bucket |
| Network | Two availability zones, private tasks, NAT gateway so the tasks can reach Gemini |
| Load balancer | Public application load balancer, HTTPS when a certificate ARN is passed |
| Secret | Gemini API key in Secrets Manager |
| Agent | Gemini 3 Flash, fallback Gemini 3.5 Flash |

The Chrome extension uses this load balancer for fill, documents, history, and reminders. Reload the unpacked extension from `apps/extension/dist` after pulling.

## Automatic deploy

A push to `main` updates the image and the stack. It does not change whether the site is on or off.

## On and off

Run these by hand from the Actions tab. They do not run on a commit.

- **Turn AWS off** stops the web tasks and the database.
- **Turn AWS on** starts the database, then starts two web tasks.

A stopped database starts itself again after 7 days. The load balancer and NAT gateway stay in place so the site address does not change. Those two still have a small hourly charge. The database and the web tasks are the large charge, and they stop when the system is off.

The repository needs these GitHub Actions secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `GEMINI_API_KEY`

They belong to the same deploy user and Gemini key used for the first setup. The workflow does not print them.
