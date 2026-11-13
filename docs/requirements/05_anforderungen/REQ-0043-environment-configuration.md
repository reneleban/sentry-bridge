---
id: REQ-0043
legacy_id: none
type: non-functional
source: "#87 / PR #89, #93 / PR #96"
status: implemented
priority: Not documented
---

# REQ-0043: Environment configuration

## Description

Portability: The system shall read its runtime settings from environment variables with the defaults below; invalid numeric values fall back to the default.

## Rationale

Not documented.

## Acceptance Criteria

| Variable                           | Default               | Purpose                                                     |
| ---------------------------------- | --------------------- | ----------------------------------------------------------- |
| `PORT`                             | `3000`                | Web UI port                                                 |
| `CONFIG_PATH`                      | `/config/config.json` | Config file path                                            |
| `ALLOWED_HOSTS`                    | empty                 | Extra allowed hostnames (REQ-0039)                          |
| `CIRCUIT_BREAKER_THRESHOLD`        | `5`                   | Failures before a breaker opens (REQ-0025)                  |
| `CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | `60000`               | Breaker reset timeout (REQ-0026)                            |
| `RETRY_BASE_DELAY_MS`              | `1000`                | Reconnect base delay (REQ-0027)                             |
| `RETRY_MAX_DELAY_MS`               | `30000`               | Reconnect delay cap (REQ-0027)                              |
| `HEALTHCHECK_CRITICAL_TIMEOUT_MS`  | `120000`              | Critical health timeout (REQ-0029)                          |
| `JANUS_MODE`                       | `auto`                | `bundled`, `hosted` or `auto`; any other value means `auto` |
| `JANUS_DEBUG_LEVEL`                | `2`                   | Janus log verbosity (0 = fatal … 5 = huge)                  |
| `JANUS_HOST_IP`                    | none (required)       | Host LAN IP for port binding and ICE (REQ-0042)             |
| `JANUS_RTP_PORT_RANGE`             | `10100-10200`         | Janus UDP port range (REQ-0042)                             |

## Related ADRs

None documented.
