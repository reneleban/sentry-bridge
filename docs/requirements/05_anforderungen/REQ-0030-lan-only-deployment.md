---
id: REQ-0030
legacy_id: NFR-S01
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0030: LAN-only deployment

## Description

Security: LAN-only deployment.

## Rationale

Not documented.

## Acceptance Criteria

- The bridge is built for the LAN: the web UI and REST API have no authentication by design (#30).
- Users must not expose port 3000 to the internet or untrusted networks; remote access goes through a VPN or an authenticating reverse proxy

## Related ADRs

None documented.
