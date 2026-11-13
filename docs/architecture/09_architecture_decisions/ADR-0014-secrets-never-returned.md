# ADR-0014: Secrets Never Returned; Empty Field Keeps the Stored Value

## Status

Accepted

## Context and Problem Statement

`GET /api/config` returned the PrusaLink password and the Obico API key in plain text, so any device on the LAN could read them (#75). The frontend only needed them to pre-fill forms and send the whole config back on save. The security review (#91, F6) then found that the response still revealed more than needed (hint with the last three characters, RTSP userinfo). How can the UI edit the config without the API exposing secrets?

## Decision Drivers

- No API response may contain a stored secret.
- Saving the config without touching secret fields must keep them.
- A client must not be able to send a stored secret to a host of its choice.

## Considered Options

1. **Return secrets to the UI** — status before #75.
2. **Never return secrets; an empty field keeps the stored value, bound to the same target.**

## Decision Outcome

Chosen: **Option 2**.

`GET /api/config` returns no secret values: the password and API key are replaced by a set/not-set hint (`***` or empty), and the userinfo of the camera RTSP URL is redacted (`toPublicConfig`). An empty password or API key in `POST /api/setup/save`, `POST /api/wizard/test-prusalink` and `POST /api/wizard/verify-pairing` falls back to the stored one, but only for the same target: the password only when PrusaLink URL and username equal the stored ones, the API key only when the Obico server URL equals the stored one, the camera credentials (a redacted RTSP URL) only for the same host and path; otherwise the request fails with `400`. One helper, `mergeStoredSecrets` in `src/config/secrets.ts`, implements the rule. `verify-pairing` saves the new API key itself and does not return it.

## Consequences

- **Positive:** Secrets never leave the backend through the API. Dashboard saves keep secrets without re-entry.
- **Negative:** Changing the PrusaLink URL or username, or the Obico server URL, requires re-entering the password or pairing again.
