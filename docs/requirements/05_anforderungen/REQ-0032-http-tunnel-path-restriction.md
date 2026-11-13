---
id: REQ-0032
legacy_id: NFR-S03
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0032: http.tunnel path restriction

## Description

Security: http.tunnel path restriction.

## Rationale

Not documented.

## Acceptance Criteria

- The `http.tunnelv2` handler only proxies an explicit allow-list of endpoints (currently `GET /api/files`) — prevents use as a general HTTP proxy and keeps setup, wizard, reconnect, control and file-mutating endpoints LAN-only.
- Methods other than `GET`, `POST`, `DELETE` return `405`.
- Paths are matched on the decoded pathname only (query ignored for matching, forwarded unchanged); non-canonical paths (`.`/`..` segments, empty segments, backslashes, percent-encoded `.`, `/`, `\` or NUL) return `403`.
- `GET /` returns a static page that links to the bridge UI on the LAN (ADR-0010); every other request returns `403`

## Related ADRs

- [ADR-0010](../../architecture/09_architecture_decisions/ADR-0010-obico-tunnel-scope.md)
