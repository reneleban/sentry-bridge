# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The WebRTC stream passes the camera's H.264 video through instead of re-encoding it, cutting the container's CPU use from about 32 % to 11 % of one core and its memory from about 250 MB to 145 MB on a Core One. Janus now sends new viewers the latest keyframe right away, and the advertised H.264 level matches the camera (4.0). (#88)

### Security

- Print file downloads requested by Obico are only fetched from the configured Obico server origin or from hosts listed in the new `obico.downloadAllowedHosts` setting (dashboard settings, one host per line). Redirects are re-checked against the same rule. **Obico Cloud users must add the host their print files are served from to this list**, otherwise printing from Obico fails with a "download url not allowed" error. (#140)

## [2.0.0] - 2026-11-13

### ⚠ Breaking changes

These apply as soon as you pull the new image, even if you keep your compose file:

- **Access through a DNS name containing a dot is rejected with 403** unless the name is listed in the new `ALLOWED_HOSTS` environment variable. This affects reverse proxies, Tailscale MagicDNS and local DNS names such as `printer.lan`. IP addresses, `localhost`, single-label names and `*.local` keep working. (#93)
- **`/config` is handed to uid 1000 on start.** The container now runs as the unprivileged `node` user and changes the owner of the config directory and the bridge's own files in it (not recursively) to uid/gid 1000 on the host. (#98)

This applies when you take over the new `docker-compose.yml`:

- **Ports are bound to `JANUS_HOST_IP`.** The web port and the Janus UDP range are published on the host LAN IP instead of all interfaces, and `docker compose up` fails if `JANUS_HOST_IP` is unset. Open the UI at `http://<JANUS_HOST_IP>:3000` instead of `http://localhost:3000`. (#90)

### Security

- The container entrypoint no longer follows symlinks in `/config`: a link planted by the `node` user can no longer redirect root's `chown`/`chmod` to another file, or force the bridge to fall back to running as root. (#131)
- The bridge, Janus and ffmpeg run as the unprivileged `node` user (uid 1000). On start the container hands `/config`, `config.json`, `print-state.json` and `file-sizes.json` to that user (not recursively) and keeps `config.json` at mode `0600`, so existing installs migrate without manual steps. If ownership cannot be changed (NFS root_squash, rootless Docker), it keeps running as root and logs a warning. (#98)
- Requests with an unknown `Host` header are rejected (403). **BREAKING:** access through a DNS name containing a dot (reverse proxy, Tailscale MagicDNS, local DNS names such as `printer.lan`) requires the name in the new `ALLOWED_HOSTS` environment variable; IP addresses, `localhost`, single-label and `*.local` names keep working. (#93)
- Cross-site write requests (`POST`/`PUT`/`DELETE` whose `Origin` does not match `Host`) are rejected (403); a reverse proxy must pass the original `Host` header through. (#93)
- No API response returns the stored PrusaLink password or Obico API key. Empty secret fields in the dashboard and wizard keep the stored value, and a stored secret is only reused for the same PrusaLink host and user or the same Obico server. Changing the Obico server URL now requires a new pairing. (#75)
- `GET /api/config` no longer returns RTSP credentials or characters of stored secrets. (#91)
- Camera URLs must use `rtsp://` or `rtsps://`. (#91)
- `config.json` is written with mode `0600`. (#91)
- The bundled Janus WebSocket listens on loopback only; the default Janus admin secret was removed. (#91)
- Obico messages are logged by key only, not with their content. (#91)
- The Obico HTTP tunnel only serves a link page at `/` and a read-only `GET /api/files`; all other paths are rejected with 403. (#14)

### Added

- **Obico file dialog:** "Open G-Code File → OctoPrint" in Obico lists the printer's USB files, newest first, with search, and starts a print from the dialog. (#122)
- **File sizes:** PrusaLink's file list has no sizes, so the bridge looks them up one file at a time in the background and stores them in `file-sizes.json` next to `config.json`; only new or changed files are looked up. The dashboard file browser shows the size column, a progress bar while sizes are being collected, and the 10 newest files plus a search over all files. (#122)
- Startup checks for PrusaLink reachability and credentials, the camera, Obico reachability and pairing, shown on the dashboard with fix hints and a re-check button; the bridge start is never blocked by them (`GET`/`POST /api/boot-checks`). (#13)
- Camera status dot on the dashboard image with fps and frame age; the stream reconnects when no frame arrives for a while. (#84)
- `JANUS_RTP_PORT_RANGE` environment variable (default `10100-10200`) and documentation for running several printers on one host. (#87, #7)
- Failed pause, resume and cancel commands are reported back to Obico and shown as a dashboard warning. (#113)
- `SECURITY.md` with the supported deployment (private LAN or VPN), trust assumptions, and how to report vulnerabilities (#90)
- Warning that the bridge has no authentication in the README, quickstart, and Docker Compose guide, and a startup log line stating it (#90)
- Note that Docker-published ports bypass host firewalls such as `ufw` (#90)

### Changed

- **BREAKING: published ports are bound to the host LAN IP.** `docker-compose.yml`, the README, and the docs now publish the web port and the Janus UDP range as `${JANUS_HOST_IP}:<port>` instead of on all interfaces. `JANUS_HOST_IP` is now required: `docker compose up` fails with an error if it is unset or empty, and `docker run` examples use `-p <LAN-IP>:3000:3000`. Existing setups must set `JANUS_HOST_IP` (e.g. in `.env`) before upgrading their compose file, and open the UI at `http://<JANUS_HOST_IP>:3000` instead of `http://localhost:3000`. (#90)
- Node 26 LTS in the image and CI, TypeScript 7; `dev:backend` uses `tsx watch`. (#58)
- The dashboard health badge pulses on each update instead of showing a ticking "last checked" counter, and turns grey when updates stop. (#79)
- PrusaLink 5xx responses mark PrusaLink degraded and count toward its circuit breaker; 4xx responses do not. (#114)
- Docker image builds use `npm ci`; GitHub Actions are pinned to commit SHAs and updated by Dependabot. (#92)
- Dependabot updates are bundled into one monthly PR. (#106)
- Removed the unused retry jitter option. (#126)

### Fixed

- The bridge reconnects to Obico on its own after the Obico server was down long enough to open the circuit breaker (e.g. during an Obico update); before, it stayed disconnected until restarted. (#127)
- PrusaLink requests time out after 10 s (uploads after 10 minutes) instead of hanging. (#112)
- Frame uploads to Obico run through their own circuit breaker (`obico_frames` in the health view), never overlap, and file their warnings under `obico_frames`. (#115, #116, #117)
- Unsupported Obico passthru requests get an error reply instead of none. (#121)
- The camera boot check no longer shows a red alert right after a container start; a failed camera check is retried once after 15 s. (#120)
- The Obico "OctoPrint" button and HTTP tunnel work against a real Obico server (BSON frames). (#14)
- The dashboard camera reconnects after the camera was replaced, stopped or unreachable for a long time. (#9)
- The camera stream recovers after its circuit breaker opened, the Janus watchdog keeps working after a recovery, the video path restarts when Janus comes back, and `/api/camera/snapshot` reuses the running stream instead of starting another ffmpeg. (#63, #67, #68, #69, #72)
- Less ffmpeg and Janus log noise. (#73)
- The bridge no longer crashes when Obico sends two Janus messages while the local Janus socket is still connecting. (#78)
- The Janus relay no longer leaves a second connection pair after a restart, and ignores empty Janus payloads from Obico. After a Janus restart, reload the Obico page to get the live view back. (#74, #81)
- The setup wizard shows where to switch the camera to RTSP streaming in Prusa Connect. (#8)
- README no longer claims the bridge offers no file upload (`POST /api/files/upload`) (#90)
- RTSP passwords containing `/`, spaces or `@`, or split across ffmpeg output chunks, no longer leak into logs (#62)
- Frame uploads to Obico time out after 15 s, include the server's response in the error, and report persistent failures to the health view (#62)
- The bundled Janus logs a warning when it finds no config directory (#62)
- README states the ffmpeg 5+ requirement for source builds (#62)
- PrusaLink READY ("ready to print") is reported to Obico as idle, and UNKNOWN no longer ends the current print (#64)

## [1.2.0] - 2026-11-10

### Changed

- One print stays one print in Obico: the bridge keeps a persistent mapping from PrusaLink job id to start time in `print-state.json`, so bridge restarts, pauses, ATTENTION prompts and BUSY phases no longer split a print. Updating the bridge during a running print splits that print once. (#55)

### Fixed

- The camera test in the setup wizard and the dashboard snapshot work with ffmpeg 5+ (`-timeout` instead of `-stimeout`). (#54)
- The bundled Janus starts correctly in Docker: its config is shipped in the image. (#54)
- Frame upload failures to Obico are logged, and RTSP credentials are redacted from ffmpeg log output. (#54)
- The camera stream no longer stalls after hours: ffmpeg pipes are drained, watchdogs escalate to SIGKILL, stalls are reported in health, and the bundled Janus is restarted when it stops answering. (#56)

### Dependencies

- Dependabot unblocked and high audit findings fixed (#59); backend and frontend dependency updates (#60, #61).

## [1.1.1] - 2026-06-08

### Security

- `npm audit fix` resolves three moderate advisories in `ws`, `qs` and `brace-expansion`. (#47)

### Changed

- Dependency updates for backend and frontend; the dev tooling requires Node 22.22.1 or later. (#45)
- Package version synced with the release tags (was `1.0.0`). (#47)

---

## [1.1.0] - 2026-04-13

Milestone 3: Print & Files (Phases 13–15)

### Added

- **Dashboard File Browser** — browse G-code files from PrusaLink directly in the Obico dashboard; file list with name, size, and date; one-click print start (#48)
- **Resume bug fix** — `current_print_ts` stabilized; paused state included in forwarded status so Obico correctly reflects pause/resume transitions (#79)
- **Command message handling** — support for `commands[]` message format for pause/resume/cancel control (#79)

### Fixed

- Resume command not forwarded correctly when printer was in paused state
- `current_print_ts` changed on every status poll causing Obico to treat each poll as a new print
- `commands[]` array format not handled in Obico agent command dispatcher

---

## [1.0.0] - 2026-04-07

First production-ready release. Covers Milestone 1 (Working Bridge) and Milestone 2 (Production-Ready).

### Milestone 2: Production-Ready (Phases 5–11)

#### Added

- **Dashboard Health UI** — three-component health card (PrusaLink / Obico / Camera) with colored status badges, inline Reconnect buttons, and 15s auto-refresh with Page Visibility pause/resume (#41)
- **Graceful shutdown** — ordered SIGTERM/SIGINT handler: HTTP server → Obico WS (close 1001) → ffmpeg (SIGINT + 3s SIGKILL fallback) → `process.exit(0)` with 8s hard timeout
- **Config hot-reload** — saving new credentials via the dashboard reconnects affected subsystems within 5s; no container restart required
- **Pairing timeout** — `waitForPairing()` exits with an error after 120s instead of looping forever
- **Circuit breaker registry** — `obico_ws` and `camera` circuit breakers registered; dashboard Reconnect resets CB state
- **`config/config.example.json`** — complete example matching the Config schema including the `polling` block
- **`docker-compose.yml`** — ready-to-use Compose file in the repo root
- **EXPOSE 10100-10200/udp** — Dockerfile documents the Janus WebRTC RTP port range

#### Fixed

- Crash in PrusaLink client when `body.file` is null on prints without a file attached (#66)
- `testStream()` hangs indefinitely on stalled RTSP connections — bounded by configurable timeout (#67)
- `setInterval` handle leaked on config reload — now cleared correctly
- README Node.js prerequisite corrected from 20+ to 22+

#### Changed

- Docker base image migrated to `node:22-alpine`
- `StatusCard` and `ResilienceCard` replaced by unified `HealthCard` component
- README fully rewritten: Quick Start, Docker Compose, full config reference, Known Limitations, Troubleshooting, Building from Source (#57, #58, #59)

---

### Milestone 1: Working Bridge (Phases 1–4)

#### Added

- **Config module** — `loadConfig()` / `saveConfig()` / `isConfigured()` with JSON persistence on mounted volume
- **PrusaLink client** — HTTP Digest Auth, polls `/api/v1/status` + `/api/v1/job`, pause/resume/cancel
- **Camera module** — RTSP via ffmpeg (`rtsp://[printer-ip]/live`), JPEG frame emission at configurable interval
- **Janus WebRTC relay** — live RTSP stream proxied to Obico control panel via Janus Gateway
- **Obico agent** — WebSocket connection, pairing flow, status + frame forwarding, control command dispatch
- **Resilience layer** — circuit breaker, retry with exponential backoff, health monitor, WebSocket auto-reconnect
- **Health endpoints** — `GET /api/health`, `/api/health/live`, `/api/health/ready`
- **4-step setup wizard** — PrusaLink → Camera → Obico pairing → Done
- **Dashboard** — printer status, job progress, print controls
- **Docker image** — single image with ffmpeg, multi-platform build (amd64 + arm64), Docker Hub CI/CD via GitHub Actions
- 128 backend unit tests
