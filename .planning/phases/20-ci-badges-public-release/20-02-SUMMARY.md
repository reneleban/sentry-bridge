---
phase: 20-ci-badges-public-release
plan: 02
status: complete
---

# Summary: Plan 20-02 — README Badges + CONTRIBUTING Volta

## What was built
- README.md — 4 professionelle Badges (CI, License, Docker Image Version, Node.js 22) ersetzen die alten obico-prusalink-bridge Badges
- CONTRIBUTING.md — Volta Node.js v22 Pinning-Empfehlung im Development-Setup-Abschnitt ergänzt (D-10)

## Requirements addressed
- CI-04 (README zeigt neue sentry-bridge CI/Docker-Badges)

## Verification
- Alle 4 Badges zeigen auf `reneleban/sentry-bridge` (nicht altes Repo)
- CI-Badge zeigt auf `ci.yml` (nicht `docker-publish.yml`)
- Quick-Start-Guide-Link (`docs/guide/`) war bereits vorhanden — blieb erhalten
- Volta-Empfehlung mit `volta install node@22` in CONTRIBUTING.md vorhanden

## Deviations from Plan

None — Plan wurde exakt wie beschrieben ausgeführt.

## Commits

- `6d9a4ad`: docs: update README badges and add Volta note to CONTRIBUTING (Phase 20-02)

## Self-Check: PASSED

- README.md badges verified: CI / License / Docker / Node.js 22
- Old badge (`obico-prusalink-bridge.svg`) removed
- CONTRIBUTING.md contains Volta section with `volta install node@22`
- docs/guide/ link preserved in Quick Start
