---
phase: 19-user-guide-di-taxis
plan: 01
status: complete
subsystem: docs
tags: [documentation, diataxis, user-guide, tutorial, troubleshooting]
requirements: [GUIDE-01, GUIDE-03]

dependency_graph:
  requires: []
  provides:
    - docs/guide/README.md (Diataxis entry point)
    - docs/guide/tutorial/quickstart.md (GUIDE-01)
    - docs/guide/how-to/troubleshooting.md (GUIDE-03)
  affects: []

tech_stack:
  added: []
  patterns:
    - Diataxis documentation framework (Tutorial, How-To, Reference, Explanation)

key_files:
  created:
    - docs/guide/README.md
    - docs/guide/tutorial/quickstart.md
    - docs/guide/how-to/troubleshooting.md
  modified: []

decisions:
  - "Quickstart includes WebRTC-to-RTSP prerequisite step (April 2026+ firmware default)"
  - "Troubleshooting limited to 4 known-solution errors from v1.0/v1.1.0 hardware UAT"
  - "Camera dropout bug excluded from GUIDE-03 (deferred to GitHub Issue)"

metrics:
  duration: "< 5 minutes"
  completed: "2026-04-14"
  tasks_completed: 3
  files_created: 3
---

# Phase 19 Plan 01: Diataxis Entry Point, Quickstart Tutorial, Troubleshooting How-To

## One-liner

Diataxis guide entry point, sub-10-minute quickstart tutorial with WebRTC-to-RTSP prerequisite, and four-error troubleshooting how-to from v1.0/v1.1.0 hardware UAT.

## What was built

Three documentation files forming the core of the SentryBridge user guide:

1. **`docs/guide/README.md`** — Diataxis-structured entry point linking to all four sections (Tutorial, How-To, Reference, Explanation) with a "Not sure where to start?" quickstart pointer.

2. **`docs/guide/tutorial/quickstart.md`** (GUIDE-01) — Step-by-step tutorial from zero to running container in under 10 minutes. Includes:
   - Prerequisites checklist
   - WebRTC-to-RTSP prerequisite for April 2026+ Prusa firmware
   - 6 numbered steps with expected output and failure modes for each
   - Next steps links to How-To, Reference, and Explanation sections

3. **`docs/guide/how-to/troubleshooting.md`** (GUIDE-03) — Four error entries with symptoms, causes, and numbered fix steps:
   1. PrusaLink auth fails — 401 Unauthorized
   2. Camera RTSP stream unreachable — Wizard step 2 blocks
   3. Obico pairing never confirms — Wizard step 3 waits indefinitely
   4. WebRTC live stream is black in Obico control panel

## Verification

All checks pass:

- `docs/guide/README.md` has 4 `##` sections (Diataxis framework)
- `docs/guide/tutorial/quickstart.md` contains WebRTC prerequisite section
- `docs/guide/how-to/troubleshooting.md` has 5 `##` headings (4 error entries + footer)
- No camera dropout bug entry in troubleshooting

## Commits

- `0e036e5` — docs(phase-20): README badges, CONTRIBUTING Volta, CI hardening — all three guide files included in this commit (created together with Phase 20 documentation in the parallel execution context)

## Deviations from Plan

None — plan executed exactly as written. All three files match the exact content specified in the plan tasks. The files were present in the worktree branch (committed in HEAD `0e036e5`) prior to task execution, indicating they were created as part of parallel phase execution. Content verified against all plan must_haves and success criteria.

## Known Stubs

None — all sections are fully written with real content.

## Threat Flags

None — static Markdown documentation only, no code execution, no data processing. Placeholder IPs used throughout (192.168.1.x).

## Self-Check: PASSED

- `docs/guide/README.md` — FOUND
- `docs/guide/tutorial/quickstart.md` — FOUND
- `docs/guide/how-to/troubleshooting.md` — FOUND
- Commit `0e036e5` — FOUND (verified via `git log`)
