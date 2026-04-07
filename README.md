# obico-prusalink-bridge

Connects Prusa Core One printers (via PrusaLink) to [Obico](https://www.obico.io/) — self-hosted or cloud. Runs as a standalone Docker container, acts as an Obico agent. No modifications to Obico or PrusaLink required.

One container = one printer.

## Features

- Setup wizard: PrusaLink credentials → camera test → Obico pairing
- Live status forwarding (temperatures, job progress, state)
- MJPEG snapshot upload for AI failure detection
- WebRTC live stream via Janus in the Obico control panel
- Pause / resume / cancel from Obico

## Quickstart

```yaml
# docker-compose.yml
services:
  bridge:
    image: reneleban/obico-prusalink-bridge:latest
    ports:
      - "3000:3000"
      - "10100-10200:10100-10200/udp" # WebRTC ICE — required for live stream
    volumes:
      - ./config:/config
    environment:
      - PORT=3000
      - CONFIG_PATH=/config/config.json
      - JANUS_HOST_IP=192.168.1.x # set to your host machine's LAN IP
    restart: unless-stopped
```

```bash
docker compose up -d
# Open http://localhost:3000 → follow setup wizard
```

## Configuration

The wizard writes `/config/config.json` on the mounted volume. All fields can also be set manually:

```json
{
  "prusalink": {
    "url": "http://192.168.1.x",
    "username": "maker",
    "password": "..."
  },
  "camera": {
    "rtspUrl": "rtsp://192.168.1.x/live",
    "frameIntervalSeconds": 10
  },
  "obico": {
    "serverUrl": "https://app.obico.io",
    "apiKey": "<auth_token from pairing>"
  }
}
```

## Architecture

```
Prusa Core One
  ├── PrusaLink HTTP  →  Bridge (status poll, pause/resume/cancel)
  └── RTSP /live      →  ffmpeg → H.264 RTP → Janus (WebRTC)
                                                   ↕ WS relay
Browser  ←  Obico Server  ←  /ws/janus/{id}/  ←  Bridge
```

- **Config module** — reads/writes JSON from mounted volume
- **PrusaLink client** — HTTP Digest Auth, polls status + job
- **Camera module** — RTSP → JPEG frames (MJPEG) + H.264 RTP (WebRTC)
- **Janus manager** — spawns/detects Janus WebRTC gateway
- **Janus relay** — bidirectional WS relay: local Janus ↔ Obico
- **Obico agent** — WebSocket to Obico, pairing flow, status + frame forwarding

## Development

### Prerequisites

- Node.js 20+
- ffmpeg
- Docker Desktop (for Janus sidecar on Mac)

### Setup

```bash
npm run install:all
```

### Janus WebRTC sidecar (Mac / dev only)

On Mac, Janus cannot be installed natively. Run it as a Docker sidecar:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts Janus with:

- WS on port `8188` (bridge relay)
- RTP input on port `17732/udp` (from ffmpeg)
- ICE media on ports `10100–10200/udp` (WebRTC)

For WebRTC to work during local development, set `nat_1_1_mapping` in `config/janus/janus.jcfg` to your Mac's LAN IP (e.g. `192.168.1.x`). This tells Janus which IP to advertise for ICE so the browser can reach it.

The bridge auto-detects a running Janus on `ws://127.0.0.1:8188` before looking for a local binary.

In production (Docker image), Janus runs natively inside the container — set `JANUS_HOST_IP` in the environment instead of editing the config file directly.

### Run

```bash
npm run dev:all          # backend (ts-node watch) + frontend (Vite)
```

Frontend proxies `/api/*` to the backend automatically.

### Test

```bash
npm run test:backend     # Jest, watch mode: npm run test:backend -- --watch
```

### Build

```bash
npm run build:all        # TypeScript + Vite → dist/ + frontend/dist/
npm run build:docker     # Docker image (single platform)
```

## Environment variables

| Variable                           | Default               | Description                                                                                                                                                                              |
| ---------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                             | `3000`                | HTTP port                                                                                                                                                                                |
| `CONFIG_PATH`                      | `/config/config.json` | Config file path                                                                                                                                                                         |
| `JANUS_HOST_IP`                    | _(unset)_             | **Required for WebRTC.** LAN IP of the Docker host. Janus advertises this as its ICE candidate so the browser can reach it. Without this, the live stream falls back to MJPEG snapshots. |
| `JANUS_MODE`                       | `auto`                | `bundled` — bridge manages Janus binary; `hosted` — external/sidecar; `auto` — detect                                                                                                    |
| `JANUS_DEBUG_LEVEL`                | `2`                   | Janus log verbosity: 0=Fatal 1=Err 2=Warn 3=Info 4=Verbose 5=Huge                                                                                                                        |
| `CIRCUIT_BREAKER_THRESHOLD`        | `5`                   | Consecutive PrusaLink failures before circuit opens                                                                                                                                      |
| `CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | `60000`               | Time (ms) before retrying after circuit opens                                                                                                                                            |
| `RETRY_BASE_DELAY_MS`              | `1000`                | Initial retry delay (ms)                                                                                                                                                                 |
| `RETRY_MAX_DELAY_MS`               | `30000`               | Maximum retry delay (ms)                                                                                                                                                                 |
| `HEALTHCHECK_CRITICAL_TIMEOUT_MS`  | `120000`              | Time (ms) a critical component can stay DOWN before `/api/health/ready` returns 503                                                                                                      |
