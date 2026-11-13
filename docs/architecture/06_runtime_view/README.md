# Chapter 6: Runtime View

This chapter documents nine key runtime scenarios that illustrate how SentryBridge behaves during operation. Each scenario is shown as a Mermaid sequence diagram.

---

## Scenario 1: Pairing Flow

The initial pairing establishes the connection between SentryBridge and the Obico server. The wizard triggers this flow after the user configures PrusaLink and camera.

```mermaid
sequenceDiagram
    participant UI as Web UI (Browser)
    participant Bridge as SentryBridge
    participant Obico as Obico Server

    UI->>Bridge: POST /api/wizard/verify-pairing {setup, obicoServerUrl, code}
    Bridge->>Obico: POST /api/v1/octo/verify/?code=<code>
    Obico-->>Bridge: 200 { printer: { auth_token, id, name } }
    Bridge->>Bridge: saveConfig() with auth_token as apiKey → emit config-changed
    Bridge-->>UI: 200 { ok, serverUrl } (no apiKey)
    Bridge->>Obico: WebSocket connect wss://{server}/ws/dev/ (Authorization: bearer {auth_token})
    Obico-->>Bridge: WebSocket established
    Bridge->>Obico: PATCH /api/v1/octo/printer/ { agent_name: "moonraker_obico", agent_version: "2.1.0" }
```

---

## Scenario 2: Frame Loop

After pairing, SentryBridge continuously captures camera frames and forwards them to Obico for AI failure detection. One persistent ffmpeg process decodes the RTSP stream; the bridge uploads at most one frame per `frameIntervalSeconds` and skips frames while an upload is still running. Uploads go through their own circuit breaker (`obico_frames`); when it opens, the `obico_frames` health component becomes DEGRADED and the WebSocket is not affected.

```mermaid
sequenceDiagram
    participant Printer as Buddy3D Camera (RTSP)
    participant ffmpeg as ffmpeg process (persistent)
    participant Camera as Camera Module
    participant Bridge as Bridge (frame forwarding)
    participant Obico as Obico Server

    Camera->>ffmpeg: spawn once: ffmpeg -rtsp_transport tcp -i rtsp://[ip]/live -vf fps=5 -f image2pipe -vcodec mjpeg pipe:1
    ffmpeg->>Printer: RTSP connect
    loop Continuous stream
        Printer-->>ffmpeg: H.264 stream
        ffmpeg-->>Camera: JPEG frames (stdout pipe, 5 fps)
        Camera->>Bridge: onFrame(frame)
        opt frameIntervalSeconds elapsed and no upload running
            Bridge->>Obico: POST /api/v1/octo/pic/ (multipart: pic=pic.jpg) via obico_frames breaker
            Obico-->>Bridge: 200 OK
        end
    end
```

---

## Scenario 3: Reconnect Flow

When the Obico WebSocket connection drops, SentryBridge reconnects with exponential backoff.

```mermaid
sequenceDiagram
    participant Bridge as SentryBridge (Obico Agent)
    participant CB as Circuit Breaker (obico_ws)
    participant Obico as Obico Server
    participant Health as Health Monitor

    Obico--xBridge: WebSocket disconnect (network error)
    Bridge->>CB: recordFailure()
    CB-->>Bridge: state: CLOSED (failure count < threshold)
    Bridge->>Health: setComponentState("obico_ws", DOWN)

    loop Exponential backoff (1s → 2s → 4s → … → 30s max)
        Bridge->>Obico: WebSocket connect attempt
        alt Connection succeeds
            Obico-->>Bridge: WebSocket established
            Bridge->>Health: setComponentState("obico_ws", HEALTHY)
            Bridge->>CB: recordSuccess()
        else Connection fails
            Obico--xBridge: Connection refused / timeout
            Bridge->>CB: recordFailure()
            Bridge->>Bridge: increase backoff delay (cap at 30s)
        end
    end
```

---

## Scenario 4: Print-Start Flow

Obico sends a print command (from the Obico control panel or file library). SentryBridge dispatches it to PrusaLink and sends a ref-matched ACK.

```mermaid
sequenceDiagram
    participant Obico as Obico Server
    participant Bridge as SentryBridge (Obico Agent)
    participant PrusaLink as PrusaLink HTTP API

    Obico->>Bridge: WebSocket passthru { ref, target: "Printer", func: "start_printer_local_print", kwargs: { gcode_file_id } }
    Bridge->>Bridge: resolve file name from gcode_file_id
    Bridge->>PrusaLink: POST /api/v1/files/usb/{filename}/print (HTTP Digest Auth)
    PrusaLink-->>Bridge: 204 No Content
    Bridge->>Obico: WebSocket passthru ACK { ref, ret: null }

    Note over Bridge,Obico: For file_downloader.download flow:
    Obico->>Bridge: WebSocket passthru { func: "file_downloader.download", kwargs: { url } }
    Bridge->>Bridge: SSRF check — url origin must match configured obicoServerUrl
    Bridge->>Obico: GET {url} (download G-code from Obico server)
    Obico-->>Bridge: G-code file content
    Bridge->>PrusaLink: POST /api/v1/files/usb (multipart upload)
    PrusaLink-->>Bridge: 201 Created
    Bridge->>PrusaLink: POST /api/v1/files/usb/{filename}/print
    PrusaLink-->>Bridge: 204 No Content
    Bridge->>Obico: WebSocket passthru ACK { ref, ret: null }
```

---

## Scenario 5: Config Hot-Reload

When the user saves a new configuration through the dashboard, the bridge tears down all active connections and reinitialises with the new config.

```mermaid
sequenceDiagram
    participant UI as Web UI (Browser)
    participant API as Express API
    participant Config as Config Module
    participant Bridge as Bridge Orchestrator

    UI->>API: POST /api/setup/save { prusalink, camera, obico, ... }
    API->>Config: saveConfig(newConfig)
    Config->>Config: write /config/config.json
    Config->>Bridge: emit("config-changed")
    Bridge->>Bridge: stopBridge() — close WS, kill ffmpeg, clear poll interval
    Bridge->>Config: loadConfig()
    Bridge->>Bridge: startBridge() — init PrusaLink client, Camera, Obico Agent
    Bridge-->>API: bridge restarted
    API-->>UI: 200 { ok: true }
```

---

## Scenario 6: Circuit Breaker Trip

When PrusaLink becomes unreachable, the circuit breaker opens after 5 consecutive failures, preventing further requests until the reset timeout expires.

```mermaid
sequenceDiagram
    participant Bridge as SentryBridge (Poll Loop)
    participant CB as Circuit Breaker (prusalink)
    participant PrusaLink as PrusaLink HTTP API
    participant Health as Health Monitor

    loop Poll every 5s
        Bridge->>CB: execute(getStatus)
        CB->>PrusaLink: GET /api/v1/status (HTTP Digest Auth)
        PrusaLink--xCB: timeout / connection refused
        CB->>CB: recordFailure() — count: 1→2→3→4→5
    end

    Note over CB: threshold=5 reached → circuit OPEN
    CB->>Health: setComponentState("prusalink", DOWN)

    loop While circuit OPEN (60s reset timeout)
        Bridge->>CB: execute(getStatus)
        CB-->>Bridge: CircuitOpenError (no request sent to PrusaLink)
    end

    Note over CB: 60s elapsed → circuit HALF-OPEN
    Bridge->>CB: execute(getStatus)
    CB->>PrusaLink: GET /api/v1/status (probe request)

    alt PrusaLink recovered
        PrusaLink-->>CB: 200 OK
        CB->>CB: circuit CLOSED
        CB->>Health: setComponentState("prusalink", HEALTHY)
    else Still unreachable
        PrusaLink--xCB: timeout
        CB->>CB: circuit OPEN again (60s reset restarts)
    end
```

---

## Scenario 7: Boot Checks

At bridge start (and on `POST /api/boot-checks`) the boot checks run in the background; the bridge never waits for them (ADR-0016).

```mermaid
sequenceDiagram
    participant Bridge as Bridge Orchestrator
    participant Boot as Boot Service
    participant PrusaLink as PrusaLink HTTP API
    participant Camera as Camera Module
    participant Obico as Obico Server
    participant UI as Web UI (Browser)

    Bridge->>Boot: runAndStoreBootChecks(config) (not awaited)
    Boot->>PrusaLink: testConnection() → reachable, credentials
    alt Camera running
        Boot->>Camera: latestFrame(maxAge)
    else No camera running
        Boot->>Camera: testStream() (RTSP probe)
    end
    opt Camera check failed
        Boot->>Boot: wait 15 s, retry camera check once
    end
    Boot->>Obico: GET {serverUrl} (any HTTP response = reachable)
    Boot->>Boot: store report (results with i18n hint keys)
    UI->>Boot: GET /api/boot-checks
    Boot-->>UI: { checkedAt, results }
```

---

## Scenario 8: Obico Tunnel Request

Obico's "OctoPrint" button and file dialog reach the bridge through `http.tunnelv2` (ADR-0010).

```mermaid
sequenceDiagram
    participant Obico as Obico Server
    participant Agent as Obico Agent
    participant Tunnel as tunnel.ts
    participant API as Express API (127.0.0.1)

    Obico->>Agent: WebSocket binary frame (BSON) http.tunnelv2 { ref, method, path, headers }
    Agent->>Tunnel: handleTunnelRequest()
    alt GET /
        Tunnel-->>Agent: 200 static LAN-only page
    else GET /api/files (allow-listed)
        Tunnel->>API: GET /api/files (Host, Origin, Sec-Fetch-*, Accept-Encoding dropped)
        API-->>Tunnel: OctoPrint-shaped file list
    else other method or path
        Tunnel-->>Agent: 405 / 403
    end
    Agent->>Obico: BSON frame { ref, response: { status, compressed, content, headers } } (zlib when body ≥ 1000 bytes)
```

---

## Scenario 9: Print State Restore after Restart

The start timestamp sent to Obico as `current_print_ts` identifies a print. It is persisted in `print-state.json` so a bridge restart during a print does not split the print in Obico (ADR-0015).

```mermaid
sequenceDiagram
    participant Store as print-state.json
    participant Agent as Obico Agent
    participant PrusaLink as PrusaLink HTTP API
    participant Obico as Obico Server

    Agent->>Store: load() at agent creation
    Store-->>Agent: { jobId, ts, ended? } or null
    Agent->>PrusaLink: GET /api/v1/job
    PrusaLink-->>Agent: { id, state }
    alt stored jobId matches and not ended
        Agent->>Agent: reuse stored ts
    else new job PRINTING or PAUSED
        Agent->>Agent: ts = now
        Agent->>Store: save({ jobId, ts }) (write .tmp, rename)
    else no running job
        Agent->>Agent: no ts
    end
    Agent->>Obico: status { current_print_ts: ts }
```
