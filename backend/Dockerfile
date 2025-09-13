# Backend (NestJS) multi-stage image with Puppeteer deps
FROM node:20-bookworm-slim AS builder
# Use corepack to manage Yarn (preinstalled in Node 20 images)
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

# Install dependencies (with dev deps for build)
COPY package.json yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else yarn install --no-lockfile; fi

# Copy source and build
COPY . ./
RUN yarn build


FROM node:20-bookworm-slim AS runtime

# Install minimal system deps required by Chromium used by Puppeteer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libdrm2 \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only (activate Yarn via corepack)
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY package.json yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production=true; else yarn install --production=true --no-lockfile; fi

# Copy build output
COPY --from=builder /app/dist ./dist

# Optional: seed sqlite if present (will be overridden when mounting a volume)
COPY database.sqlite ./database.sqlite

# Ensure runtime dirs exist (also created at app start)
RUN mkdir -p ./dist/uploads ./presentation

EXPOSE 3001
CMD ["node", "dist/main.js"]
