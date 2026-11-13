# ADR-0016: Non-Blocking Boot Checks

## Status

Accepted

## Context and Problem Statement

With an invalid or incomplete configuration (wrong PrusaLink URL or password, unreachable RTSP stream) errors appeared only in the container logs (#13). The issue proposed validating all values on startup and starting normal operation only when all checks pass. Right after a container start, the camera check also failed while the camera came up healthy (#120). How should the bridge report configuration problems?

## Decision Drivers

- The user must see what to fix without reading logs.
- A temporarily unreachable component must not stop the bridge.
- A check must not compete with the running camera for the printer's RTSP session.
- Results must not leak secrets.

## Considered Options

1. **Gate bridge start on all checks passing** — as proposed in #13.
2. **Run checks in the background; the bridge always starts.**

## Decision Outcome

Chosen: **Option 2** (`src/boot/checks.ts`, `src/boot/service.ts`, `src/routes/boot-checks.ts`).

Checks: PrusaLink reachable, PrusaLink credentials, camera RTSP, Obico reachable, Obico paired. They run in the background at bridge start and on `POST /api/boot-checks`; `GET /api/boot-checks` returns the latest report. Concurrent runs share one run. Results carry i18n hint keys only, never error text. While the bridge camera runs, its recent frame is the camera evidence; an RTSP probe runs only when no camera runs. A failed camera check is retried once after 15 s (#120).

## Consequences

- **Positive:** The bridge recovers on its own once a component becomes reachable; the dashboard shows what to fix.
- **Negative:** The bridge runs (and logs errors) with a broken configuration; the report can lag behind the actual state until the next check.
