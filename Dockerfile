# Multi-stage build: build the Vite app, then serve the static output with nginx.
# Target: Render Web Service with the Docker runtime (binds to 0.0.0.0:$PORT, PORT defaults to 10000).

# ---- Build stage ----
FROM node:24-slim AS build

# The build needs devDependencies (vite, vue-tsc), so keep NODE_ENV out of "production".
ENV NODE_ENV=development

WORKDIR /app

# pnpm version is taken from package.json "packageManager"
RUN corepack enable

# Install dependencies first so this layer is cached across source changes
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build (dist/)
COPY . .
RUN pnpm build

# ---- Runtime stage ----
FROM nginx:stable-alpine AS runtime

# Render injects PORT at runtime; keep 10000 as the local/Render default.
ENV PORT=10000

# Rendered to /etc/nginx/conf.d/default.conf on container start
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 10000
