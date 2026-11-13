---
id: REQ-0033
legacy_id: NFR-S04
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0033: Credential storage

## Description

Security: Credential storage.

## Rationale

Not documented.

## Acceptance Criteria

- PrusaLink credentials and Obico API key are stored in plaintext in `/config/config.json` on the Docker volume; the volume must be access-controlled at the OS/Docker level
- `config.json` is written with mode `0600`; the container entrypoint keeps it at `0600` on start
- No API response returns the stored secrets (PrusaLink password, Obico API key, RTSP credentials); `GET /api/config` returns them masked

## Related ADRs

None documented.
