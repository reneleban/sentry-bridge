# Requirements Index

One file per requirement (`REQ-NNNN-<slug>.md`). IDs are numbered in the order of the former SRS documents: functional requirements first, then non-functional requirements.

**Mapping note:** Before issue #28, requirements were identified as `SRS-001` … `SRS-019` (functional) and `NFR-P01` … `NFR-M02` (non-functional). Each REQ file keeps its old ID in the `legacy_id` frontmatter field, so references in older commits, PRs and the changelog can still be traced. Where the former documents gave no rationale, source, status or priority, the REQ file says "Not documented".

| ID                                                        | Legacy ID | Title                                 | Type           | Status         |
| --------------------------------------------------------- | --------- | ------------------------------------- | -------------- | -------------- |
| [REQ-0001](REQ-0001-config-file.md)                       | SRS-001   | Configuration from JSON file          | functional     | verified       |
| [REQ-0002](REQ-0002-prusalink-digest-auth.md)             | SRS-002   | PrusaLink connection with Digest Auth | functional     | verified       |
| [REQ-0003](REQ-0003-prusalink-polling.md)                 | SRS-003   | PrusaLink status and job polling      | functional     | verified       |
| [REQ-0004](REQ-0004-print-control-relay.md)               | SRS-004   | Pause/resume/cancel relay             | functional     | verified       |
| [REQ-0005](REQ-0005-camera-capture.md)                    | SRS-005   | RTSP camera frame capture             | functional     | verified       |
| [REQ-0006](REQ-0006-frame-upload.md)                      | SRS-006   | Camera frame upload to Obico          | functional     | verified       |
| [REQ-0007](REQ-0007-obico-websocket.md)                   | SRS-007   | Persistent Obico WebSocket            | functional     | verified       |
| [REQ-0008](REQ-0008-obico-pairing.md)                     | SRS-008   | Obico pairing flow                    | functional     | verified       |
| [REQ-0009](REQ-0009-setup-wizard.md)                      | SRS-009   | Setup wizard                          | functional     | verified       |
| [REQ-0010](REQ-0010-dashboard.md)                         | SRS-010   | Live dashboard                        | functional     | verified       |
| [REQ-0011](REQ-0011-mjpeg-stream.md)                      | SRS-011   | MJPEG stream endpoint                 | functional     | verified       |
| [REQ-0012](REQ-0012-webrtc-stream.md)                     | SRS-012   | WebRTC live stream via Janus          | functional     | verified       |
| [REQ-0013](REQ-0013-circuit-breaker.md)                   | SRS-013   | Circuit breaker protection            | functional     | verified       |
| [REQ-0014](REQ-0014-graceful-shutdown.md)                 | SRS-014   | Graceful SIGTERM shutdown             | functional     | verified       |
| [REQ-0015](REQ-0015-file-management.md)                   | SRS-015   | G-code file management                | functional     | verified       |
| [REQ-0016](REQ-0016-octoprint-file-endpoints.md)          | SRS-016   | OctoPrint-compatible file endpoints   | functional     | verified       |
| [REQ-0017](REQ-0017-obico-print-start.md)                 | SRS-017   | Print start from Obico                | functional     | verified       |
| [REQ-0018](REQ-0018-download-origin-validation.md)        | SRS-018   | Download URL scheme validation        | functional     | verified       |
| [REQ-0019](REQ-0019-startup-checks.md)                    | SRS-019   | Startup and on-demand checks          | functional     | verified       |
| [REQ-0020](REQ-0020-camera-frame-upload-latency.md)       | NFR-P01   | Camera frame upload latency           | non-functional | Not documented |
| [REQ-0021](REQ-0021-printer-status-poll-interval.md)      | NFR-P02   | Printer status poll interval          | non-functional | Not documented |
| [REQ-0022](REQ-0022-obico-status-update-frequency.md)     | NFR-P03   | Obico status update frequency         | non-functional | Not documented |
| [REQ-0023](REQ-0023-setup-wizard-response-time.md)        | NFR-P04   | Setup wizard response time            | non-functional | Not documented |
| [REQ-0024](REQ-0024-file-upload-throughput.md)            | NFR-P05   | File upload throughput                | non-functional | Not documented |
| [REQ-0025](REQ-0025-circuit-breaker-trip-threshold.md)    | NFR-R01   | Circuit breaker trip threshold        | non-functional | Not documented |
| [REQ-0026](REQ-0026-circuit-breaker-reset-timeout.md)     | NFR-R02   | Circuit breaker reset timeout         | non-functional | Not documented |
| [REQ-0027](REQ-0027-reconnect-backoff.md)                 | NFR-R03   | Reconnect backoff                     | non-functional | Not documented |
| [REQ-0028](REQ-0028-pairing-timeout.md)                   | NFR-R04   | Pairing timeout                       | non-functional | Not documented |
| [REQ-0029](REQ-0029-critical-health-timeout.md)           | NFR-R05   | Critical health timeout               | non-functional | Not documented |
| [REQ-0030](REQ-0030-lan-only-deployment.md)               | NFR-S01   | LAN-only deployment                   | non-functional | Not documented |
| [REQ-0031](REQ-0031-ssrf-mitigation-for-file-download.md) | NFR-S02   | SSRF mitigation for file download     | non-functional | Not documented |
| [REQ-0032](REQ-0032-http-tunnel-path-restriction.md)      | NFR-S03   | http.tunnel path restriction          | non-functional | Not documented |
| [REQ-0033](REQ-0033-credential-storage.md)                | NFR-S04   | Credential storage                    | non-functional | Not documented |
| [REQ-0034](REQ-0034-container-platforms.md)               | NFR-PO01  | Container platforms                   | non-functional | Not documented |
| [REQ-0035](REQ-0035-node-js-runtime.md)                   | NFR-PO02  | Node.js runtime                       | non-functional | Not documented |
| [REQ-0036](REQ-0036-no-database-dependency.md)            | NFR-PO03  | No database dependency                | non-functional | Not documented |
| [REQ-0037](REQ-0037-test-coverage.md)                     | NFR-M01   | Test coverage                         | non-functional | Not documented |
| [REQ-0038](REQ-0038-module-boundaries.md)                 | NFR-M02   | Module boundaries                     | non-functional | Not documented |
| [REQ-0039](REQ-0039-host-and-origin-guard.md)             | none      | Host and Origin request guard         | non-functional | implemented    |
| [REQ-0040](REQ-0040-unprivileged-container-user.md)       | none      | Unprivileged container user           | non-functional | implemented    |
| [REQ-0041](REQ-0041-prusalink-request-timeouts.md)        | none      | PrusaLink request timeouts            | non-functional | implemented    |
| [REQ-0042](REQ-0042-janus-network-deployment.md)          | none      | Janus network deployment              | non-functional | implemented    |
| [REQ-0043](REQ-0043-environment-configuration.md)         | none      | Environment configuration             | non-functional | implemented    |
