# Developer Guide

This document covers what you need to know for local development.

## Prerequisites

- Node.js 18+
- npm
- Docker and Docker Compose

## Project Setup

```bash
git clone https://github.com/crowdsecurity/cs-log-replay-gui.git
cd cs-log-replay-gui
npm install
```

## Development

Start everything (CrowdSec Docker container + dev servers):

```bash
npm run dev
```

This runs concurrently:
- **CrowdSec Docker container** (`crowdsec-dev`) with NGINX and LINUX collections pre-installed
- **Frontend (Vite)**: http://localhost:5173
- **Backend (Express)**: http://localhost:3000 (with `IS_DEV=true`)

The Vite dev server proxies API and WebSocket requests to the Express backend.

### The Docker Trick

This project executes CrowdSec CLI commands (`crowdsec`, `cscli`) on the server. In production (KillerCoda), commands are prefixed with `sudo` and run directly on the host. For local development, you don't need CrowdSec installed — everything runs inside a Docker container.

When `IS_DEV=true`, the server:
1. Prefixes all commands with `docker exec crowdsec-dev` instead of `sudo`
2. Writes temp log files to `dev/tmp/` on the host, which is bind-mounted to `/tmp/crowdsec-replay/` in the container
3. Uses the container-side path (`/tmp/crowdsec-replay/...`) in CrowdSec commands so the container can access the files

This is handled in `src/server/services/replay/runner.ts` via the `buildCommand()` function.

### Individual Commands

```bash
npm run dev:client    # Start Vite dev server only
npm run dev:server    # Start Express server only (with hot reload)
npm run dev:docker    # Start only the CrowdSec Docker container
npm run dev:stop      # Stop the CrowdSec Docker container
npm run lint          # Run ESLint
```

### E2E Tests

```bash
npx playwright test              # Run all e2e tests
npx playwright test --headed     # Run with visible browser
```

Tests are in the `e2e/` directory and use Playwright. They run against the real CrowdSec Docker container (started automatically via `npm run dev`). Shared helpers are in `e2e/helpers.ts` and log samples in `dev/log-examples/`.

**Important:** Stop the dev server before running tests, as they start their own server. Check with `lsof -i:5173` or `lsof -i:3000`.

## Building for Production

```bash
npm run build         # Build both client and server
npm start             # Run production server (no Docker, expects local CrowdSec)
```

The production build:
- Compiles React app to `dist/client/`
- Compiles Express server to `dist/server/`
- Express serves the static React build

## Troubleshooting

```bash
# Check if the CrowdSec container is running
docker ps

# View CrowdSec container logs
docker logs crowdsec-dev

# Check installed collections
docker exec crowdsec-dev cscli collections list

# Check alerts
docker exec crowdsec-dev cscli alerts list

# Restart the container
npm run dev:stop && npm run dev:docker
```
