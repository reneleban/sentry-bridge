# ADR-0013: Host/Origin Request Guard Instead of API Authentication

## Status

Accepted

## Context and Problem Statement

The bridge has no login by design (LAN/VPN only, #30). A website that a LAN user merely visits can still act on it (#93): `POST /api/files/upload`, `POST /api/files/:name/print` and `POST /api/boot-checks` are CORS simple requests (CSRF), and because the server answered any `Host` header, a DNS-rebinding domain gained same-origin access to the whole API, including the camera stream. How can the API be protected without adding authentication?

## Decision Drivers

- Keep the login-less LAN design.
- Block cross-site writes and DNS rebinding for every route and the static files.
- Allow access via reverse proxies or DNS names with dots when the user opts in.

## Considered Options

1. **Add API authentication** — contradicts the LAN-only decision of #30.
2. **One Host/Origin middleware mounted before all routes.**

## Decision Outcome

Chosen: **Option 2** — `requestGuard()` in `src/lib/request-guard.ts`, mounted first in `src/server.ts`.

- **Host check (all methods):** only IPv4 literals, bracketed IPv6 literals, single-label hostnames (e.g. `localhost`), `*.local` names, or hosts listed in the `ALLOWED_HOSTS` environment variable (comma-separated, default empty) are accepted.
- **Cross-site write check (all methods except GET/HEAD/OPTIONS):** rejected if `Sec-Fetch-Site` is present and not `same-origin`/`none`, or if `Origin` is present and its host and port differ from `Host`.
- Rejections answer `403` with a JSON `error` reason.

`docker-compose.yml` additionally publishes the ports only on `JANUS_HOST_IP`, not on all interfaces.

## Consequences

- **Positive:** CSRF and DNS rebinding are blocked without a login. The rule set is one pure function (`checkRequest`) with unit tests.
- **Negative:** Access via a hostname with dots (reverse proxy, Tailscale MagicDNS) needs `ALLOWED_HOSTS`. This is not authentication: any LAN client can still use the API (R-04).
