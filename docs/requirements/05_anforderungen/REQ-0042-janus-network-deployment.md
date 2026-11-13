---
id: REQ-0042
legacy_id: none
type: non-functional
source: "#87, #7 / PR #89, #90 / PR #95"
status: implemented
priority: Not documented
---

# REQ-0042: Janus network deployment

## Description

Portability / Security: The system shall publish its web port and the Janus WebRTC UDP port range on the Docker host's LAN IP only, with a configurable port range so several printers (one container each) can run on one host.

## Rationale

Not documented.

## Acceptance Criteria

- `JANUS_HOST_IP` is required: `docker compose up` fails if it is unset or empty; Janus advertises it as ICE candidate.
- The web port (`PORT`, default `3000`) and the UDP range `JANUS_RTP_PORT_RANGE` (default `10100-10200`) are published on `JANUS_HOST_IP`, not on all interfaces.
- Several bridge containers run on one host when each uses its own web port and a non-overlapping `JANUS_RTP_PORT_RANGE`.

## Related ADRs

None documented.
