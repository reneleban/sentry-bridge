# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`obico-prusalink-bridge` is a standalone Docker service that connects Prusa Core One printers (via PrusaLink) to Obico (self-hosted or cloud). It acts as an Obico agent — no modifications to Obico or PrusaLink required.

One container instance = one printer.

## Stack

- **Backend**: Node.js + TypeScript, Express
- **Frontend**: React + TypeScript, Vite
- **Container**: Single Docker image with ffmpeg installed
- **Config**: JSON file on mounted volume (`/config/config.json`)

## Key Environment Variables

| Variable      | Default               | Purpose                              |
| ------------- | --------------------- | ------------------------------------ |
| `PORT`        | `3000`                | Web UI port                          |
| `CONFIG_PATH` | `/config/config.json` | Path to config file inside container |

## Architecture

Four core modules — design interfaces first, write tests second, implement third (TDD):

- **Config Module** — reads/writes JSON config from volume. Interface: `loadConfig()`, `saveConfig()`, `isConfigured()`
- **PrusaLink Client** — HTTP Digest Auth, polls `/api/v1/status` + `/api/v1/job`, sends pause/resume/cancel. Interface: `getStatus()`, `getJob()`, `pause()`, `resume()`, `cancel()`, `testConnection()`, `testCamera()`
- **Camera Module** — RTSP via ffmpeg (`rtsp://[printer-ip]/live`), emits JPEG frames at configurable interval. Interface: `start()`, `stop()`, `onFrame(cb)`, `testStream()`
- **Obico Agent** — WebSocket to Obico server, pairing flow, forwards status + frames, receives control commands. Protocol reverse-engineered from open-source Moonraker agent.

Express serves the compiled React frontend as static files under `/`, API routes under `/api/`.

## Obico Agent Protocol

**Before implementing the Obico Agent module**: read the Moonraker agent source from the obico-server open-source repo to extract WebSocket message formats, authentication flow, and heartbeat requirements. This is a hard prerequisite.

## Camera

- RTSP endpoint: `rtsp://[printer-ip]/live` (unauthenticated, LAN only — Buddy3D board)
- Snapshot endpoint (for wizard test only): `GET /api/v1/cameras/{id}/snap` (HTTP Digest Auth required)
- Camera is **mandatory** — setup wizard blocks if RTSP is unreachable

## Setup Wizard (4 steps)

1. PrusaLink URL + credentials → connection test
2. RTSP camera test → frame preview (mandatory)
3. Obico server URL → pairing code display → wait for confirmation
4. Done → redirect to dashboard

## Development

```bash
# Install all dependencies (root + frontend)
npm run install:all

# Dev mode
npm run dev:backend          # ts-node watch mode (backend only)
npm run dev:frontend         # Vite dev server (frontend only)
npm run dev:all              # both in parallel

# Dev with local proxy (Vite proxies /api → backend, no CORS issues)
npm run dev:frontend:proxy   # Vite dev server with proxy config active

# Build
npm run build:backend        # compile TypeScript → dist/
npm run build:frontend       # Vite build → frontend/dist/
npm run build:all            # both sequentially (used in Docker)

# Start (production, after build:all)
npm run start:backend        # run compiled Express server
npm run start:all            # build:all + start:backend

# POC validation — self-contained, run from scripts/poc/
# cd scripts/poc && npm install
OBICO_URL=http://192.168.1.x:3334 npm run obico       # validate Obico agent protocol

# Docker
npm run build:docker               # build image locally (single platform)
npm run build:docker:multiplatform # build for amd64 + arm64 (requires buildx)

# Tests
npm run test:backend         # backend unit tests
npm run test:all             # all tests
npm run test:backend -- --watch  # watch mode
```

> **Local development proxy**: `dev:frontend:proxy` enables Vite's built-in proxy so `/api/*` calls from the React dev server are forwarded to `http://localhost:3000`. This avoids CORS issues during development without changing any API URLs.

## Git Workflow

- Default branch is `main` (set globally: `git config --global init.defaultBranch main`)
- GSD manages branches automatically per phase: `gsd/phase-{N}-{slug}` (e.g. `gsd/phase-9-documentation`)
- Never commit directly to `main`
- Claude opens the PR, the user reviews and merges
- PR title format: `feat(#N): short description`
- Close the issue via PR description: `Closes #N`

## Testing

TDD is mandatory for the three testable modules: Config, PrusaLink Client, Obico Agent.

- Write the interface → write the tests → write the implementation
- Test only external behavior through public interfaces
- Do not test React frontend components in early phase

Test reports are written to `reports/` (gitignored) on every `npm run test:backend` run:

- `reports/test-report.html` — human-readable HTML report
- `reports/junit.xml` — JUnit XML for CI
