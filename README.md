# CrowdSec Log Replay GUI

GUI application for CrowdSec log replay debugging. Upload a small log file (NGINX or Syslog, max 10 lines) and replay it through a local CrowdSec instance to display generated alerts and per-line explanations.

Built with React + Vite frontend and Express + Socket.IO backend.

## Requirements

- Node.js >= 18
- Docker and Docker Compose (for local development)

## Quick Start

```bash
npm install
npm run dev
```

This starts:
- **CrowdSec** Docker container with NGINX and LINUX collections
- **Client** dev server on http://localhost:5173
- **Server** on http://localhost:3000 (with `IS_DEV=true`)

No need to install CrowdSec on your host — commands run inside the Docker container via `docker exec`.

To stop the Docker container after development:

```bash
npm run dev:stop
```

## Usage

1. **Paste or upload** a log file (max 10 lines)
2. **Select the log type** — NGINX, Syslog (SSH/Linux), or a custom type
3. **Click Replay Logs** — the server runs:
   - `crowdsec --dsn file://<path> --type <type> --no-api` (replay)
   - `cscli alerts list -o json` (fetch alerts)
   - `cscli explain -f <path> -t <type>` (line-by-line explanation)
4. **View results** — alerts with decisions and explain output

## Commands

```bash
npm run dev          # Start CrowdSec Docker + dev servers (client :5173, server :3000)
npm run dev:docker   # Start only the CrowdSec Docker container
npm run dev:stop     # Stop the CrowdSec Docker container
npm run build        # Build for production
npm start            # Run production server (no Docker, expects local CrowdSec)
npm run lint         # Run ESLint
npx playwright test  # Run e2e tests
```

## KillerCoda

A pre-configured KillerCoda scenario is included in `killercoda/`. It installs CrowdSec with NGINX and LINUX collections, builds the GUI, and starts the server automatically.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.
