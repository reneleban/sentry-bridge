---
id: REQ-0006
legacy_id: SRS-006
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0006: Camera frame upload to Obico

## Description

The system shall upload JPEG camera frames to the Obico server via HTTP POST to `/api/v1/octo/pic/`.

## Rationale

Not documented.

## Acceptance Criteria

- The Obico server displays an up-to-date camera image in the printer detail view within 2× the configured frame interval.
- Error cases:
  - (1) Obico unreachable or responding non-2xx: the frame is dropped (no retry); the next frame is attempted at the next upload interval. A non-2xx failure is logged with the status and up to 200 characters of the response body.
  - (2) An upload that does not complete within 15 s is aborted and counts as a failure.
  - (3) After 3 consecutive failures, a single WARN `Frame upload failing: <reason>` is pushed to the health monitor (`obico_frames`, separate from the WebSocket key `obico_ws`); the first successful upload afterwards pushes a WARN `Frame upload recovered after <n> failures` and resets the counter.
  - (4) Frame uploads pass through their own circuit breaker (`obico_frames`), separate from the WebSocket breaker (`obico_ws`): after `CIRCUIT_BREAKER_THRESHOLD` consecutive failures, uploads are rejected without contacting Obico until `CIRCUIT_BREAKER_RESET_TIMEOUT_MS` has elapsed, then a single trial upload decides whether it closes again. Rejections while the breaker is open are not counted as upload failures. While the breaker is open, the health state of `obico_frames` is `degraded`; the next successful upload sets it back to `healthy`. The `obico_frames` state never triggers a container restart. A manual Obico reconnect also resets the frame breaker and sets `obico_frames` to `healthy`.
  - (5) While an upload is in flight, further frames are skipped; uploads never overlap.

## Related ADRs

None documented.
