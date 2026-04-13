---
phase: 19-user-guide-di-taxis
plan: 01
status: complete
subsystem: docs
tags: [documentation, diataxis, guide, tutorial, troubleshooting]
dependency_graph:
  requires: []
  provides: [docs/guide/README.md, docs/guide/tutorial/quickstart.md, docs/guide/how-to/troubleshooting.md]
  affects: []
tech_stack:
  added: []
  patterns: [Diátaxis framework, action-first tone]
key_files:
  created:
    - docs/guide/README.md
    - docs/guide/tutorial/quickstart.md
    - docs/guide/how-to/troubleshooting.md
  modified: []
decisions:
  - "Tutorial success state = container running, wizard completed, dashboard visible (D-03)"
  - "WebRTC→RTSP prerequisite as numbered step before docker run (D-04)"
  - "Action-first tone: what to do, expected output, failure mode — no why-explanations in steps (D-05)"
  - "Only errors with known solutions from v1.0/v1.1.0 UAT included; camera dropout excluded (D-09, D-10)"
metrics:
  duration: "~10 min"
  completed_date: "2026-04-13"
  tasks: 3
  files: 3
---

# Phase 19 Plan 01: Guide Entry + Quickstart + Troubleshooting Summary

**One-liner:** Diátaxis guide entry point, sub-10-minute quickstart with WebRTC-to-RTSP prerequisite, and four-error troubleshooting guide migrated from v1.0/v1.1.0 UAT findings.

## What was built

- `docs/guide/README.md` — Diátaxis framework overview with navigation to all four sections (Tutorial, How-To, Reference, Explanation)
- `docs/guide/tutorial/quickstart.md` — Step-by-step quickstart (GUIDE-01) with WebRTC→RTSP prerequisite step, 6 numbered steps each with expected result and failure mode
- `docs/guide/how-to/troubleshooting.md` — 4 known errors with symptom, cause, and numbered fix steps (GUIDE-03); camera dropout bug intentionally excluded per D-10

## Requirements addressed

- GUIDE-01 (Quickstart Tutorial)
- GUIDE-03 (Troubleshooting)

## Verification

All automated checks pass:

- All three files exist
- `docs/guide/README.md` has 4 `##` sections (Diátaxis quadrants)
- `docs/guide/tutorial/quickstart.md` contains WebRTC prerequisite section
- `docs/guide/how-to/troubleshooting.md` has 5 `##` sections (4 error entries + footer)
- No "dropout" / camera bug entry in troubleshooting

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new security-relevant surface introduced. All files are static Markdown with placeholder IPs only.

## Self-Check: PASSED

- `docs/guide/README.md` — FOUND
- `docs/guide/tutorial/quickstart.md` — FOUND
- `docs/guide/how-to/troubleshooting.md` — FOUND
- Commit `f686c54` — FOUND
