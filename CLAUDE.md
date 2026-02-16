# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GUI application for CrowdSec log replay debugging. Users upload a small log file (NGINX or Syslog, max 10 lines) and the tool replays it through a local CrowdSec instance to display generated alerts and per-line explanations. Built with React + Vite frontend and Express + Socket.IO backend, following the same architecture as [cs-ipdex-gui](https://github.com/crowdsecurity/cs-ipdex-gui).

**Key difference from IPDEX GUI**: This tool does NOT call a remote API. It executes local CrowdSec CLI commands (`crowdsec`, `cscli`) on the server where the app runs (typically a KillerCoda instance with CrowdSec pre-installed).

**Dev mode (`IS_DEV=true`)**: In local development, CrowdSec runs in a Docker container (`crowdsec-dev`). The server uses `docker exec` to run commands inside the container instead of `sudo` on the host. Temp log files are written to `/tmp/crowdsec-replay/` which is bind-mounted into the container.

## Commands

```bash
npm run dev          # Start CrowdSec Docker container + dev servers (client :5173, server :3000)
npm run dev:docker   # Start only the CrowdSec Docker container
npm run dev:stop     # Stop the CrowdSec Docker container
npm run build        # Build for production
npm start            # Run production server (no Docker, expects local CrowdSec)
npm run lint         # Run ESLint
npx playwright test  # Run e2e tests
```

## Architecture

> **Note:** Keep this tree updated when adding, removing, or renaming files.

```
src/
├── client/
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Main wizard orchestrator
│   ├── types.ts             # Client-side type definitions
│   ├── hooks/
│   │   ├── useSocket.ts     # Socket.IO connection and state management
│   │   └── useTheme.ts      # Dark/light theme toggle
│   └── components/
│       ├── Header.tsx       # App header with theme toggle
│       ├── LogInputForm.tsx # Log input step (textarea/upload + type selection)
│       ├── CommandOutput.tsx # Real-time replay progress display
│       └── ResultsView.tsx  # Alerts and explain output display
└── server/
    ├── index.ts             # Express + Socket.IO setup
    └── services/replay/
        ├── index.ts         # Service exports
        ├── runner.ts        # CrowdSec command execution (crowdsec, cscli)
        └── types.ts         # Type definitions for alerts, log types, etc.
doc/
└── DEVELOPER.md             # Developer guide for local development
e2e/
├── helpers.ts               # Test helper functions (submitLogs, flowToResults)
└── nginx-replay.spec.ts     # NGINX log replay e2e tests (CVE-2017-9841)
dev/
├── README.md                # Dev environment documentation
├── Dockerfile               # CrowdSec Docker image
└── docker-compose.yml       # Docker Compose for local CrowdSec
killercoda/
├── index.json               # KillerCoda scenario config
├── intro.md                 # Introduction page
├── finish.md                # Finish page
├── background.sh            # Background setup (install CrowdSec + collections)
└── foreground.sh            # Foreground progress display
```

## Wizard Flow

1. **Log input** — User pastes or uploads a log file (max 10 lines). Selects log type via checkboxes (nginx, syslog, or custom). An info banner explains that the installed collections are NGINX and LINUX, so the tool detects behaviors on nginx and ssh.
2. **Replay execution** — Server writes logs to a temp file and runs:
   - `crowdsec --dsn file://<path> --type <type> --no-api` (replay)
   - `cscli alerts list -o json` (fetch generated alerts)
   - `cscli explain -f <path> -t <type>` (line-by-line explanation)
   Commands are prefixed with `sudo` in production (KillerCoda) or `docker exec crowdsec-dev` in dev mode (`IS_DEV=true`). Progress is streamed in real-time via Socket.IO.
3. **Results display** — Shows alerts (JSON) and the explain output. A notice warns this is for line-by-line debugging only.

## Log Type Mapping

Log types are defined as a mapping for easy extension:

```typescript
const LOG_TYPES: Record<string, string> = {
  "NGINX": "nginx",
  "Syslog (SSH/Linux)": "syslog",
  // Add new types here as needed
};
```

Users can also enter a custom type string for types not in the list.

## Validation Rules

- Log content (textarea or file) has no line count limit. All lines are replayed for alert generation.
- The **explain** output is limited to the **first 10 lines** (`MAX_EXPLAIN_LINES`). The runner writes a separate truncated temp file for `cscli explain`.
- At least one log type must be selected or a custom type provided.

## Real-time Communication

Same pattern as IPDEX GUI: Socket.IO streams progress from server to client. Client emits events to trigger replay, server responds with `output` events containing stdout/stderr/exit from the CrowdSec commands.

## KillerCoda Setup

The app requires a running CrowdSec instance with NGINX and LINUX collections. The KillerCoda scenario handles this:

1. **env-init.sh** (background, runs at intro):
   - Install nginx so CrowdSec auto-detects it
   - Add CrowdSec repo: `curl -s https://install.crowdsec.net | sudo sh`
   - Install CrowdSec: `apt install crowdsec -y` (auto-installs linux + nginx collections)
   - Optionally ensure collections: `cscli collections install crowdsecurity/linux && cscli collections install crowdsecurity/nginx`
   - Install Node.js, clone repo, build, and start the server
2. **foreground.sh**: Shows setup progress, waits for server health check

Reference: [LaurenceJJones/workshop-katacoda/crowdsec-setup](https://github.com/LaurenceJJones/workshop-katacoda/tree/main/crowdsec-setup)

## React Patterns

**Avoid useEffect when possible** (see [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)):
- State transitions: Use callbacks instead of Effects watching state changes.
- DOM manipulation: Use ref callbacks instead of Effects.
- Valid useEffect: Synchronizing with external systems (Socket.IO connection in `useSocket.ts`).

## Documentation

When implementing a new feature, update all relevant documentation:
- **`CLAUDE.md`** — Update the architecture tree and any affected sections.
- **`README.md`** — Update the usage section if the feature is user-facing.
- **`doc/DEVELOPER.md`** — Update if the change affects local development setup or workflow.

## Testing

All new features must include related e2e tests. Tests use Playwright.

**Important:** Before running e2e tests, check if the dev server (`npm run dev`) is already running. Tests may fail or use stale code if an existing server is running. Check with `lsof -i:5173` or `lsof -i:3000`.