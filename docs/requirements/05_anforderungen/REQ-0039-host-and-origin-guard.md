---
id: REQ-0039
legacy_id: none
type: non-functional
source: "#93 / PR #96"
status: implemented
priority: Not documented
---

# REQ-0039: Host and Origin request guard

## Description

Security: The system shall reject HTTP requests with an unknown `Host` header and cross-site write requests (DNS rebinding and CSRF protection), configurable via the `ALLOWED_HOSTS` environment variable.

## Rationale

Not documented.

## Acceptance Criteria

- A request whose `Host` is not an IP address, `localhost`, a single-label hostname, a `*.local` name or a name listed in `ALLOWED_HOSTS` (comma-separated, default empty) is rejected with HTTP 403 and a hint to `ALLOWED_HOSTS`.
- A non-safe request (anything other than `GET`, `HEAD`, `OPTIONS`) is rejected with HTTP 403 if `Sec-Fetch-Site` is present and neither `same-origin` nor `none`, or if `Origin` is present and does not match the `Host` header (hostname and port).

## Related ADRs

None documented.
