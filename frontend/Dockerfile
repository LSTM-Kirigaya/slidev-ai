# Frontend (Vite + Vue) - build then serve via Nginx
FROM node:20-bookworm-slim AS builder
RUN npm i -g yarn@1.22.22
WORKDIR /app
# Copy manifest and (optionally) lockfile first for better cache
COPY package.json yarn.lock* ./
# Prefer locked install; fall back when no lockfile
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else yarn install --no-lockfile; fi
COPY . ./
RUN yarn build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

# Copy built assets
COPY --from=builder /app/dist ./

# Nginx config for SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
