# PrusaLink API Research — Prusa Core One

**Issue:** #4  
**Status:** Complete  
**Firmware:** Buddy board (tested on Core One)  
**Source:** https://github.com/prusa3d/Prusa-Link-Web/blob/master/spec/openapi.yaml

---

## Summary

| Endpoint                  | Method | Purpose                                 |
| ------------------------- | ------ | --------------------------------------- |
| `/api/v1/status`          | GET    | Printer telemetry (state, temps, axes)  |
| `/api/v1/job`             | GET    | Active job info (204 when idle)         |
| `/api/v1/job/{id}/pause`  | PUT    | Pause active print                      |
| `/api/v1/job/{id}/resume` | PUT    | Resume paused print                     |
| `/api/v1/job/{id}`        | DELETE | Cancel print                            |
| `/api/v1/info`            | GET    | Printer info (nozzle, serial, hostname) |

**Authentication:** HTTP Digest Auth, username `maker`, password shown on printer display.  
**Camera:** Not part of PrusaLink on Core One — Buddy3D Camera runs independently at `rtsp://192.168.178.65/live`.

---

## 1. GET /api/v1/status

Returns real-time printer telemetry. Always available.

```json
{
  "storage": {
    "path": "/usb/",
    "name": "usb",
    "read_only": false
  },
  "printer": {
    "state": "IDLE",
    "temp_bed": 25.2,
    "target_bed": 0.0,
    "temp_nozzle": 26.5,
    "target_nozzle": 0.0,
    "axis_z": 0.0,
    "axis_x": 252.0,
    "axis_y": -19.0,
    "flow": 100,
    "speed": 100,
    "fan_hotend": 0,
    "fan_print": 0
  }
}
```

**Possible `state` values:**

- `IDLE` — ready, no print
- `BUSY` — warming up, homing, etc.
- `PRINTING` — active print
- `PAUSED` — print paused
- `FINISHED` — print completed
- `STOPPED` — print cancelled
- `ERROR` — error state
- `ATTENTION` — requires user action

---

## 2. GET /api/v1/job

**When idle:** `204 No Content` (empty body — not an error)

**When printing:** `200 OK`

```json
{
  "id": 420,
  "state": "PRINTING",
  "progress": 42.5,
  "time_printing": 1800,
  "time_remaining": 2400,
  "inaccurate_estimates": false,
  "file": {
    "name": "benchy.gcode",
    "display_name": "benchy_0.2mm_PETG.gcode",
    "path": "/usb/",
    "display_path": "/usb/",
    "size": 1048576,
    "m_timestamp": 1712000000
  }
}
```

**Job `state` values:** `PRINTING`, `PAUSED`, `FINISHED`, `STOPPED`, `ERROR`

---

## 3. Job Control

All job control endpoints use the job `id` from `GET /api/v1/job`.

### Pause

```
PUT /api/v1/job/{id}/pause
Response: 204 No Content
```

### Resume

```
PUT /api/v1/job/{id}/resume
Response: 204 No Content
```

### Cancel

```
DELETE /api/v1/job/{id}
Response: 204 No Content
```

**Error responses:**

- `401` — auth failed
- `404` — job not found
- `409` — invalid state transition (e.g. pause when already paused)

---

## 4. GET /api/v1/info

```json
{
  "nozzle_diameter": 0.4,
  "mmu": false,
  "serial": "10589-3742441633914285",
  "hostname": "prusa-core-one",
  "min_extrusion_temp": 170
}
```

---

## Implementation Notes for `src/prusalink/client.ts`

1. **Auth**: `node-fetch` or `axios` with HTTP Digest Auth (`digest-fetch` package).
2. **Status polling**: `GET /api/v1/status` at configurable interval (default 2s).
3. **Job polling**: `GET /api/v1/job` — handle `204` as "no active job", not an error.
4. **Control flow**: Get job ID from `GET /api/v1/job` first, then use it for pause/resume/cancel.
5. **Camera**: No PrusaLink endpoint — RTSP stream at `rtsp://[buddy3d-ip]/live` is separate.
6. **testConnection()**: `GET /api/v1/info` — lightweight, always available, returns printer identity.
7. **testCamera()**: Not via PrusaLink — use RTSP test in Camera Module instead.
