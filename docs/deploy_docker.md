# Deploy with Docker

This guide covers running slidev-ai using Docker and docker compose with two containers: backend (NestJS) and frontend (Nginx serving built assets).

## Prerequisites
- Internet access to pull base images
- OPENAI credentials (required by backend at startup)

## Services and Ports
- Backend (NestJS): listens on 3001 (exposed as 3001)
- Frontend (Nginx): listens on 80 (mapped to host 8080)

## Environment Variables (Backend)
The backend validates these at startup:

- `OPENAI_API_KEY`: your API key
- `OPENAI_BASE_URL`: e.g. `https://api.openai.com/v1`
- `OPENAI_MODEL`: e.g. `gpt-4o-mini`

You can set them in your shell or create a `.env` at repo root (compose will read shell envs by default).

Windows cmd (temporary for current shell):

```
set OPENAI_API_KEY=your_key
set OPENAI_BASE_URL=https://api.openai.com/v1
set OPENAI_MODEL=gpt-4o-mini
```

Or create `.env` file:

```
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## Build and Run

From repository root:

```
docker compose up -d --build
```

Access:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3001/api

## Data Persistence
The compose file binds following host paths to persist data:
- `backend/uploads` -> `/app/uploads`
- `backend/presentation` -> `/app/presentation`
- `backend/database.sqlite` -> `/app/database.sqlite`

## Configure Frontend API Endpoint
Frontend gets API endpoint at build time via envs:
- `VITE_DOMAIN` (default: `localhost`)
- `VITE_PORT` (default: `3001`)
- `VITE_ENABLE_HTTPS` (default: `false`)

If deploying backend under another host/port/protocol, change frontend environment variables in `docker-compose.yml` and rebuild.

## Troubleshooting
- Port conflicts: edit `ports` in `docker-compose.yml`.
- Puppeteer deps: backend image includes required libraries; if you see missing library errors on unusual hosts, extend `backend/Dockerfile` to add packages as hinted by error messages.
- Slidev CLI online install: the backend falls back to `npx slidev` when local CLI not found. To avoid network install at runtime, add `@slidev/cli` to backend dependencies and rebuild the image.
