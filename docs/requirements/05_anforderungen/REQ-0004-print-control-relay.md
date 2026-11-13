---
id: REQ-0004
legacy_id: SRS-004
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0004: Pause/resume/cancel relay

## Description

The system shall relay pause, resume, and cancel commands received from Obico to the PrusaLink API.

## Rationale

Not documented.

## Acceptance Criteria

- Sending a pause command from Obico causes the printer state to transition to PAUSED within 10 s.
- Resume and cancel behave equivalently.
- A failed pause, resume or cancel is reported back to Obico and shown as a dashboard warning (#113); details in the error cases below.
- Error cases:
  - (1) No active job (PrusaLink `GET /api/v1/job` returns 204): no command is sent; the bridge logs `[obico] <cmd> failed: No active job`.
  - (2) Invalid state transition, e.g. pausing an already paused job (PrusaLink returns 409): the bridge logs `Conflict: invalid state transition`; printer state is unchanged.
  - (3) Any other non-2xx response: logged as `<cmd> failed: <status>`; 5xx responses also set PrusaLink health to DEGRADED (the printer answered) and count toward the PrusaLink circuit breaker, while 4xx responses (e.g. 401, 404, 409) do not.
  - (4) PrusaLink unreachable (network error) or a request that does not complete within 10 s (aborted; file uploads 10 min): logged, PrusaLink health set to DOWN, and the failure counts toward the PrusaLink circuit breaker (`CIRCUIT_BREAKER_THRESHOLD`, default 5); while the breaker is OPEN (`CIRCUIT_BREAKER_RESET_TIMEOUT_MS`, default 60 s) commands fail immediately with `Circuit breaker is OPEN`. In all cases the command is not retried; the failure is shown on the dashboard (`prusalink` health errors): failures from cases (3) 5xx and (4) appear once as the PrusaLink error, all others as a WARN `<cmd> failed: <reason>`, which a later successful pause/resume/cancel clears; and, if Obico sent the command as a passthru with a `ref`, a passthru response `{ ref, error: <reason> }` is returned (success returns `{ ref, ret: "Success" }`). Commands received via `commands[]` carry no ref and are not answered.
  - (5) Unsupported passthru request (unknown `target` or `func`): the bridge logs `[obico] unsupported passthru <target>.<func>` (args are never logged) and, if the request has a `ref`, immediately replies `{ ref, error: "unsupported: <target>.<func>" }`; requests without a `ref` are only logged.

## Related ADRs

None documented.
