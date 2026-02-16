# Dev Environment

Local development setup using Docker for CrowdSec — no need to install CrowdSec on your host.

## Prerequisites

- Docker and Docker Compose
- Node.js >= 18

## Usage

Start everything (CrowdSec container + dev servers):

```bash
npm run dev
```

This will:
1. Start a CrowdSec Docker container with NGINX and LINUX collections pre-installed
2. Start the Vite client dev server on http://localhost:5173
3. Start the Express server on http://localhost:3000 with `IS_DEV=true`

When `IS_DEV=true`, the server uses `docker exec` to run CrowdSec commands inside the container instead of `sudo` on the host. Temp log files are written to `/tmp/crowdsec-replay/` which is shared between host and container.

## Stopping

Press `Ctrl+C` to stop the dev servers, then:

```bash
npm run dev:stop
```

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
