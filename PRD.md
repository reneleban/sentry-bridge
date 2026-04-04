# PRD: obico-prusalink-bridge

## Problem Statement

Users running self-hosted Obico (open-source, LAN-only) cannot integrate Prusa printers that use PrusaLink (e.g. Prusa Core One, MK4S). Obico supports OctoPrint and Klipper/Moonraker via dedicated agents, but there is no agent for PrusaLink. This means Prusa printer owners are excluded from Obico's AI-based failure detection and remote monitoring — even when both systems run on the same local network.

## Solution

A standalone bridge service (`obico-prusalink-bridge`) that acts as an Obico agent for a PrusaLink printer. The service runs as a single Docker container, communicates with PrusaLink's REST API for printer status and control, streams camera frames from the printer's RTSP feed, and connects to any Obico server (self-hosted or cloud) using the standard Obico agent WebSocket protocol. Setup is handled via a browser-based guided wizard. A persistent dashboard shows live connection status, camera preview, and printer controls.

One container instance manages exactly one printer.

## User Stories

1. As a home user, I want to connect my Prusa Core One to my self-hosted Obico instance, so that I benefit from AI-based failure detection without cloud dependency.
2. As a user, I want a guided web-based setup wizard, so that I can configure the bridge without editing config files manually.
3. As a user, I want to enter my PrusaLink URL and credentials in the wizard, so that the bridge can authenticate with my printer.
4. As a user, I want the wizard to test the PrusaLink connection and show me printer info, so that I know the credentials are correct before proceeding.
5. As a user, I want the wizard to test my printer's RTSP camera stream and show me a live preview frame, so that I can confirm the camera is working before completing setup.
6. As a user, I want setup to fail clearly if the camera is not reachable, so that I know I need to fix the camera before the bridge is useful.
7. As a user, I want to enter my Obico server URL in the wizard, so that I can point the bridge at my self-hosted instance or Obico Cloud.
8. As a user, I want the wizard to display a pairing code I can enter in Obico's UI, so that I can link the bridge to my Obico account without manually handling API keys.
9. As a user, I want the wizard to wait for Obico pairing confirmation and then complete setup automatically, so that the process feels seamless.
10. As a user, I want the wizard to show a clear privacy notice when I enter my Obico server URL, so that I understand that camera frames and printer data will be sent to that server.
11. As a user, I want the bridge to work with both self-hosted Obico and Obico Cloud, so that I am not locked into one deployment model.
12. As a user, I want the completed configuration to be saved to a mounted Docker volume, so that my settings survive container restarts and updates.
13. As a user, I want to access a dashboard after setup, so that I can monitor the live status of my printer and the bridge at any time.
14. As a user, I want the dashboard to show the current connection status for both PrusaLink and Obico, so that I can quickly see if something is wrong.
15. As a user, I want the dashboard to show a live camera preview, so that I can check on my print without opening Obico.
16. As a user, I want the dashboard to display current printer information (print job name, progress, temperatures), so that I have a quick overview.
17. As a user, I want the dashboard to show Pause, Resume, and Cancel buttons that reflect the current printer state, so that I can only trigger actions that are valid right now.
18. As a user, I want to pause my print from the dashboard, so that I can intervene quickly without opening Obico.
19. As a user, I want to resume a paused print from the dashboard, so that I can continue after inspecting the printer.
20. As a user, I want to cancel a running or paused print from the dashboard, so that I can stop a failed print immediately.
21. As a user, I want Obico's AI to automatically pause my print when it detects a failure, so that spaghetti or other defects are caught without my involvement.
22. As a user, I want to edit my configuration (PrusaLink credentials, Obico server, camera settings) from the dashboard, so that I can update settings without re-running the full wizard.
23. As a user, I want to configure the Docker container's web UI port via an environment variable, so that I can avoid port conflicts on my Unraid server.
24. As a user, I want to configure the camera frame capture interval, so that I can balance CPU load against update frequency.
25. As a user, I want to configure the PrusaLink polling interval, so that I can reduce load on the printer's Buddy board if needed.
26. As an Unraid user, I want the container to be available on Docker Hub, so that I can pull and configure it directly from Unraid's Docker UI.

## Implementation Decisions

### Architecture

- Standalone bridge service — no modifications to Obico or PrusaLink firmware/software.
- One container instance per printer. Multiple printers require multiple containers.
- Single Docker container: Express (Node.js/TypeScript) backend serves both the REST API and the compiled React frontend as static files.
- ffmpeg is installed in the container to handle RTSP stream consumption and JPEG frame extraction.

### Modules

**Config Module**

- Reads and writes a JSON configuration file from a mounted Docker volume.
- Validates the config structure on startup and on write.
- Interface: `loadConfig()`, `saveConfig(config)`, `isConfigured(): boolean`.
- Config shape: PrusaLink URL + credentials, RTSP URL, Obico server URL + API key, poll intervals.

**PrusaLink Client**

- Authenticates via HTTP Digest Auth (username + password, default user `maker`).
- Polls `/api/v1/status` and `/api/v1/job` at a configurable interval.
- Sends control commands: pause, resume, cancel via PrusaLink REST API.
- Queries `/api/v1/cameras` to discover camera ID; uses `/api/v1/cameras/{id}/snap` for camera connectivity test during wizard.
- Interface: `getStatus()`, `getJob()`, `pause()`, `resume()`, `cancel()`, `testConnection()`, `testCamera()`.

**Camera Module**

- Connects to `rtsp://[printer-ip]/live` via ffmpeg.
- Extracts JPEG frames at a configurable interval (default: 2 seconds).
- Emits frames as Buffers for the Obico Agent to forward.
- Interface: `start()`, `stop()`, `onFrame(callback)`, `testStream(): Promise<Buffer>`.

**Obico Agent**

- Implements the Obico agent WebSocket protocol (reverse-engineered from the open-source Moonraker agent).
- Handles the pairing flow: request code from Obico server, poll for confirmation, persist received API key.
- Forwards printer status and camera frames to Obico on each update cycle.
- Receives control commands (pause/resume/cancel) from Obico and delegates to PrusaLink Client.
- Interface: `connect()`, `disconnect()`, `startPairing(serverUrl): Promise<string>` (returns code), `waitForPairing(): Promise<string>` (returns API key), `sendStatus(status)`, `sendFrame(jpeg)`.

**Express Server + API Routes**

- Serves compiled React frontend as static files under `/`.
- API routes under `/api/`:
  - `GET /api/status` — bridge health, PrusaLink connection, Obico connection
  - `POST /api/control` — pause / resume / cancel
  - `GET /api/setup/test-prusalink` — test PrusaLink connection
  - `GET /api/setup/test-camera` — test RTSP stream, returns preview frame
  - `POST /api/setup/start-pairing` — initiates Obico pairing, returns code
  - `GET /api/setup/pairing-status` — polls pairing confirmation
  - `POST /api/setup/save` — saves completed config to volume

**React Frontend**

- Setup Wizard (4 steps): PrusaLink credentials → Camera test → Obico pairing → Complete.
- Dashboard: connection status indicators, camera preview (polling `/api/camera/snapshot`), printer info, Pause/Resume/Cancel buttons.
- Config edit form accessible from the dashboard.

### Configuration (environment variables)

- `PORT` — web UI port, default `3000`
- `CONFIG_PATH` — path to JSON config file inside the container, default `/config/config.json`

### Deployment

- Docker Hub image: `obico-prusalink-bridge`
- Multi-stage Dockerfile: stage 1 builds React (Vite), stage 2 compiles TypeScript, stage 3 is the runtime image with ffmpeg.
- GitHub Actions builds and pushes on version tags.

### Obico Agent Protocol

- Protocol will be reverse-engineered from the Obico Moonraker agent (open-source) before implementing the Agent module. This is a prerequisite for step 6.

## Testing Decisions

Development follows a test-driven approach: tests are written before implementation for all testable modules. Each module's interface is designed first, tests are written against that interface, then the implementation is written to make the tests pass.

Good tests verify external behavior through the module's public interface — not internal implementation details. Tests should not depend on file system layout, specific ffmpeg process internals, or WebSocket frame encoding details.

### Modules to test

**Config Module**

- Test that `loadConfig()` correctly parses a valid JSON file.
- Test that `loadConfig()` throws a clear error on invalid/missing file.
- Test that `saveConfig()` writes the correct JSON structure.
- Test that `isConfigured()` returns false when required fields are missing.

**PrusaLink Client**

- Mock HTTP responses; test that `getStatus()` correctly maps PrusaLink API response to internal status model.
- Test that `pause()`, `resume()`, `cancel()` send the correct HTTP requests.
- Test that `testConnection()` returns failure on non-200 response or network error.

**Obico Agent**

- Mock WebSocket server; test that the pairing flow completes correctly (code received → confirmation polled → API key returned).
- Test that `sendStatus()` emits the correct message format.
- Test that incoming control commands are correctly dispatched (pause/resume/cancel mapped to PrusaLink Client calls).

### Not tested

- React frontend (Setup Wizard, Dashboard) — too much churn in early phase.
- Camera Module — ffmpeg integration is tested manually during development.
- Express API routes — covered indirectly by module tests.

## Out of Scope

- Support for printers other than Prusa Core One in this initial version (MK4S may follow as a variant since it shares PrusaLink).
- Multiple printers per container instance.
- IP camera support (non-RTSP, external cameras).
- G-code sending from the dashboard.
- Temperature control from the dashboard.
- Webcam stream transcoding to MJPEG over HTTP (snapshots only in first version).
- Unraid Community Applications template.
- Automatic firmware version detection or compatibility checks.

## Further Notes

- The Obico agent WebSocket protocol is not formally documented. Implementation of the Obico Agent module must begin with reading the Moonraker agent source code (`https://github.com/TheSpaghettiDetective/obico-server`) to extract message formats, authentication flow, and heartbeat requirements.
- The Buddy3D RTSP endpoint (`rtsp://[printer-ip]/live`) is unauthenticated and LAN-only — no credentials needed for the camera stream.
- PrusaLink uses HTTP Digest Auth on all endpoints including camera snapshot. The Camera Module's RTSP access bypasses this since RTSP runs independently.
- Privacy notice in the wizard must make clear that camera frames (images of the print environment) are transmitted to the configured Obico server. Users pointing at Obico Cloud should be aware this includes a third-party service.
