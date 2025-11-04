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

# Configure apt for better network resilience and use alternative mirrors
RUN echo 'APT::Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries \
    && echo 'APT::Acquire::http::Timeout "60";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'APT::Acquire::https::Timeout "60";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::Pipeline-Depth "0";' >> /etc/apt/apt.conf.d/80-retries

# Try to use more reliable mirrors by creating sources.list
RUN echo "deb http://deb.debian.org/debian bookworm main" > /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian bookworm-updates main" >> /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian-security bookworm-security main" >> /etc/apt/sources.list

# Install essential packages first
RUN for i in 1 2 3 4 5; do \
        apt-get update && break || { \
            echo "Attempt $i failed, retrying..." && sleep 10; \
        } \
    done && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        wget \
        git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python and build tools with minimal dependencies
RUN for i in 1 2 3 4 5; do \
        apt-get update && break || { \
            echo "Attempt $i failed, retrying..." && sleep 10; \
        } \
    done && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        curl \
        wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install pip using break-system-packages (for Docker container this is safe)
RUN curl -sSL https://bootstrap.pypa.io/get-pip.py | python3 - --break-system-packages

# Install only essential Chromium dependencies (minimal list)
RUN for i in 1 2 3 4 5; do \
        apt-get update && break || { \
            echo "Attempt $i failed, retrying..." && sleep 10; \
        } \
    done && \
    apt-get install -y --no-install-recommends --fix-missing \
        fonts-liberation \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libdrm2 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libx11-6 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libxss1 \
        libasound2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install uv (fast Python package manager) with retry mechanism and verification
RUN curl -LsSf https://astral.sh/uv/install.sh | sh || \
    (sleep 5 && curl -LsSf https://astral.sh/uv/install.sh | sh) || \
    (sleep 10 && curl -LsSf https://astral.sh/uv/install.sh | sh)
ENV PATH="/root/.cargo/bin:$PATH"

# Verify uv installation and create symlink if needed
RUN which uv || ls -la /root/.cargo/bin/ || \
    (echo "uv not found in expected location, trying alternative installation..." && \
     curl -LsSf https://astral.sh/uv/0.4.18/install.sh | sh && \
     ln -sf /root/.cargo/bin/uv /usr/local/bin/uv) && \
    uv --version

# Create symlink for python3.10 compatibility (using system python3)
RUN python3 --version && \
    ln -sf /usr/bin/python3 /usr/bin/python3.10 && \
    ln -sf /usr/bin/python3 /usr/bin/python

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only (activate Yarn via corepack)
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY package.json yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production=true; else yarn install --production=true --no-lockfile; fi

# Copy build output
COPY --from=builder /app/dist ./dist


# Validate required environment variables at build time
RUN node -e "\
  const requiredEnvVars = ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL']; \
  const errors = []; \
  requiredEnvVars.forEach(envVar => { \
    if (!process.env[envVar] || process.env[envVar].length === 0) { \
      errors.push(envVar); \
    } \
  }); \
  if (errors.length > 0) { \
    console.error('以下环境变量需要设置:'); \
    errors.forEach(err => console.error(' - ' + err)); \
    process.exit(1); \
  } \
"

# Optional: seed sqlite if present (will be overridden when mounting a volume)
RUN if [ -f database.sqlite ]; then cp database.sqlite ./database.sqlite; fi

# Ensure runtime dirs exist (also created at app start)
RUN mkdir -p ./dist/uploads ./presentation

EXPOSE 3001
CMD ["node", "dist/main.js"]
