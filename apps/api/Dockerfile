# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---- deps: install all workspace dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile || pnpm install

# ---- build: compile TypeScript to dist ----
FROM deps AS build
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @simplepos/shared build \
 && pnpm --filter @simplepos/api build
# SQL migrations are not compiled by tsc — copy them into dist.
RUN cp -r apps/api/src/db/migrations apps/api/dist/db/migrations

# ---- production: prune dev deps, run as non-root ----
FROM base AS production
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

COPY --from=build /app/packages/shared/src ./packages/shared/src
COPY --from=build /app/apps/api/dist ./apps/api/dist

# Drop privileges (node:alpine ships a 'node' user).
USER node

EXPOSE 3001
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
