# syntax=docker/dockerfile:1
# Development image for the Next.js web app (hot reload via bind mount in compose).
FROM node:20-alpine AS dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install || true

COPY . .

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["pnpm", "dev"]
