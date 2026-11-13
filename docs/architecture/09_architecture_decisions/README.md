# Chapter 9: Architecture Decisions

Architecture decisions are recorded as Architecture Decision Records (ADRs) in MADR format. ADR files live in this folder.

## ADR Index

| ID                                                | Title                                                               | Status   | Date       |
| ------------------------------------------------- | ------------------------------------------------------------------- | -------- | ---------- |
| [ADR-0001](ADR-0001-docker-single-container.md)   | Docker Single-Container Model (One Container = One Printer)         | Accepted | 2026-04-13 |
| [ADR-0002](ADR-0002-octoprint-agent-identity.md)  | OctoPrint Agent Identity for Obico WebSocket                        | Accepted | 2026-04-13 |
| [ADR-0003](ADR-0003-http-digest-auth.md)          | HTTP Digest Authentication for PrusaLink API                        | Accepted | 2026-04-13 |
| [ADR-0004](ADR-0004-rtsp-ffmpeg-camera.md)        | RTSP Camera Stream via ffmpeg                                       | Accepted | 2026-04-13 |
| [ADR-0005](ADR-0005-circuit-breaker-pattern.md)   | Circuit Breaker Pattern for External Component Resilience           | Accepted | 2026-04-13 |
| [ADR-0006](ADR-0006-config-on-volume.md)          | Configuration Stored as JSON File on Docker Volume                  | Accepted | 2026-04-13 |
| [ADR-0007](ADR-0007-mit-license.md)               | MIT License for Open-Source Release                                 | Accepted | 2026-04-13 |
| [ADR-0008](ADR-0008-janus-webrtc-relay.md)        | Janus WebRTC Relay for Live Stream in Obico Control Panel           | Accepted | 2026-04-30 |
| [ADR-0009](ADR-0009-frontend-stack.md)            | Frontend Stack — React 19 + Vite + Mantine + react-router + i18next | Accepted | 2026-04-30 |
| [ADR-0010](ADR-0010-obico-tunnel-scope.md)        | Scope of the Obico HTTP Tunnel                                      | Accepted | 2026-11-11 |
| [ADR-0011](ADR-0011-ai-code-review.md)            | AI-Powered Code Review Tooling                                      | Accepted | 2026-04-15 |
| [ADR-0012](ADR-0012-non-root-entrypoint.md)       | Non-Root Container via su-exec Entrypoint with Symlink Guard        | Accepted | 2026-11-11 |
| [ADR-0013](ADR-0013-host-origin-request-guard.md) | Host/Origin Request Guard Instead of API Authentication             | Accepted | 2026-11-11 |
| [ADR-0014](ADR-0014-secrets-never-returned.md)    | Secrets Never Returned; Empty Field Keeps the Stored Value          | Accepted | 2026-11-11 |
| [ADR-0015](ADR-0015-persisted-runtime-state.md)   | Persisted Runtime State Next to the Config File                     | Accepted | 2026-11-10 |
| [ADR-0016](ADR-0016-non-blocking-boot-checks.md)  | Non-Blocking Boot Checks                                            | Accepted | 2026-11-11 |

## Decision Process

Decisions ADR-0001 to ADR-0007 were made iteratively during development (v1.0 through v1.1.0) and documented retroactively as part of the v1.2.0 open-source release preparation. Later decisions, including those of the 2.x line, are recorded with the change that introduced them; the date is the merge date of that change. Each ADR captures the problem context, the alternatives considered, and the rationale for the chosen option.

For the full list of validated design decisions, see the ADR index above.
