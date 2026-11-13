---
id: REQ-0001
legacy_id: SRS-001
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0001: Configuration from JSON file

## Description

The system shall read printer configuration (PrusaLink URL, credentials, Obico server URL, API key) from a JSON file on a Docker volume.

## Rationale

Not documented.

## Acceptance Criteria

- `GET /api/config` returns the current configuration with secrets replaced by hints (REQ-0033).
- After editing and saving, the bridge reloads the new config without container restart.

## Related ADRs

None documented.
