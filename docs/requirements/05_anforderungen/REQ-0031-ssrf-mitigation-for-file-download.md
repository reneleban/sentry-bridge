---
id: REQ-0031
legacy_id: NFR-S02
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0031: SSRF mitigation for file download

## Description

Security: SSRF mitigation for file download. The bridge only fetches download URLs from the configured Obico server origin or from hosts the user explicitly allows in `obico.downloadAllowedHosts`, so an Obico server (or anyone able to send passthru commands) cannot make the bridge request arbitrary LAN or cloud-metadata addresses.

## Rationale

Not documented.

## Acceptance Criteria

- `file_downloader.download` only fetches URLs with an `http:` or `https:` scheme; any other scheme is rejected and reported as a passthru error (`{ ref, error }`), not as an HTTP status.
- The download target name is reduced to its basename (path traversal mitigation).
- A URL whose origin is not the configured Obico server origin and whose hostname is not in `obico.downloadAllowedHosts` is rejected without a request.
- Redirects are fetched with `redirect: "manual"`; each target is re-checked against the same rule, with at most 5 hops.

## Related ADRs

None documented.
