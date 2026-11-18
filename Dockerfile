# =========================================================================
# FormPilot AI - Production Multi-Stage Dockerfile
# =========================================================================

# Stage 1: Base Environment
FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Stage 2: Dependencies Installation
FROM base AS deps
WORKDIR /app

# Copy monorepo configuration and lockfiles
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/dom-analyzer/package.json ./packages/dom-analyzer/
COPY packages/context-engine/package.json ./packages/context-engine/
COPY apps/web/package.json ./apps/web/
COPY apps/extension/package.json ./apps/extension/

RUN pnpm config set minimum-release-age 0 && pnpm install --frozen-lockfile

# Stage 3: Builder
FROM base AS builder
WORKDIR /app

COPY --from=deps /app ./
COPY . .

# Set production env for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build shared packages and web dashboard
RUN pnpm --filter @formpilot/shared build
RUN pnpm --filter @formpilot/dom-analyzer build
RUN pnpm --filter @formpilot/context-engine build
RUN pnpm --filter @formpilot/web build

# Stage 4: Production Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

COPY --from=builder /app ./

USER nextjs

EXPOSE 3000

CMD ["pnpm", "--filter", "@formpilot/web", "start"]
