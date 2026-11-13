---
id: REQ-0036
legacy_id: NFR-PO03
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0036: No database dependency

## Description

Portability: No database dependency.

## Rationale

Not documented.

## Acceptance Criteria

- All persistent state is stored as files in `/config`: `config.json` (configuration), `print-state.json` (current print start) and `file-sizes.json` (cached file sizes) — no external database required

## Related ADRs

None documented.
