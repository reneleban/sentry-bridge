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

Security: SSRF mitigation for file download.

## Rationale

Not documented.

## Acceptance Criteria

- `file_downloader.download` only downloads from URLs whose origin matches the configured `obicoServerUrl` — any other origin is rejected with 400

## Related ADRs

None documented.
