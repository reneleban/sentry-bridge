---
phase: 19-user-guide-di-taxis
plan: 03
status: complete
---

# Summary: Plan 19-03 — Architecture Explanation + README Link

## What was built
- docs/guide/explanation/architecture-decisions.md — 4 design decision explanations for curious users (GUIDE-06)
- README.md — added one line linking to docs/guide/ at end of Quick Start section

## Requirements addressed
- GUIDE-06 (Architecture Explanation)

## Verification
All automated checks pass.

- architecture-decisions.md: 61 lines, 4 main sections + 1 further-reading section
- No internal jargon (no "reverse-engineered", no version strings, no ADR numbers)
- README.md: exactly one new line added to Quick Start, all other content unchanged
- git diff README.md shows only one added line

## Commit
- 4018111: docs(guide): add architecture explanation and README guide link (Phase 19-03)

## Self-Check: PASSED
- docs/guide/explanation/architecture-decisions.md — exists
- README.md guide link — present (grep confirmed)
- Commit 4018111 — exists
