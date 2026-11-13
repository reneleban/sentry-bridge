# Chapter 11: Risks and Technical Debt

## Risks

| ID   | Risk                                                                                                                            | Likelihood | Impact | Mitigation                                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R-01 | Obico server changes the WebSocket protocol (breaking change)                                                                   | Low        | High   | Protocol is reverse-engineered from open-source code. Monitor Obico releases. The ADR-0002 identity version (`2.1.0`) may need updating.                                       |
| R-02 | PrusaLink firmware update changes API surface                                                                                   | Low        | Medium | API is documented in the official OpenAPI spec. Only standard endpoints are used. Monitor Prusa firmware changelogs.                                                           |
| R-03 | RTSP stream unavailable after Prusa firmware update (WebRTC-only mode)                                                          | Medium     | High   | Newer Prusa firmware defaults to WebRTC streaming mode. Users must manually switch to RTSP in Prusa Connect settings. Document in setup guide.                                 |
| R-04 | No API authentication on REST endpoints                                                                                         | High       | Medium | Built for the LAN by design (#30); not planned. README tells users not to expose port 3000 and to use a VPN or an authenticating reverse proxy.                                |
| R-05 | Config stored in plaintext JSON including credentials                                                                           | Medium     | Medium | `config.json` is mode `0600` and the bridge runs as the non-root `node` user (ADR-0012); the API never returns secrets (ADR-0014). Future: consider config encryption at rest. |
| R-06 | ffmpeg process leak on RTSP timeout                                                                                             | Low        | Medium | `testStream()` has a timeout guard. The camera circuit breaker tracks failures. Monitored via health endpoint.                                                                 |
| R-07 | Container keeps running as root when `/config` cannot be handed to `node` (NFS `root_squash`, rootless Docker, read-only mount) | Low        | Medium | Entrypoint logs a warning with the uid to fix (ADR-0012). Make `/config` writable for uid 1000.                                                                                |

## Technical Debt

| ID    | Item                                                          | Impact                                                      | Priority                 |
| ----- | ------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ |
| TD-02 | Hardcoded agent identity version `2.1.0` in Obico agent       | Must be updated manually if Obico changes protocol          | Medium                   |
| TD-03 | No config schema validation at startup                        | Malformed `config.json` causes cryptic startup failure      | Medium                   |
| TD-05 | No structured logging (JSON)                                  | Harder to integrate with log aggregation tools (Loki, etc.) | Low                      |
| TD-06 | Layer count / Z-height not available from PrusaLink           | Obico shows no layer progress — requires G-code parsing     | Low — separate issue #80 |
| TD-07 | `cachedJob` fallback for FINISHED/FINISHING state is implicit | Logic depends on timing; may fail on very fast printers     | Low — monitored          |
