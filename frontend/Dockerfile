# Frontend (Vite + Vue) - build then serve via Nginx
FROM node:20-bookworm-slim AS builder
# Use corepack to manage Yarn (preinstalled in Node 20 images)
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /app
# Copy manifest and (optionally) lockfile first for better cache
COPY package.json yarn.lock* ./
# Prefer locked install; fall back when no lockfile
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else yarn install --no-lockfile; fi
COPY . ./

# Build-time env (can be overridden via --build-arg)
ARG VITE_DOMAIN=localhost
ARG VITE_PORT=8001
ARG VITE_ENABLE_HTTPS=false
# Expose as environment variables so Vite can read them at build time
ENV VITE_DOMAIN=$VITE_DOMAIN \
	VITE_PORT=$VITE_PORT \
	VITE_ENABLE_HTTPS=$VITE_ENABLE_HTTPS

RUN yarn build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

# Copy built assets
COPY --from=builder /app/dist ./

# Nginx config for SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
