---
id: REQ-0040
legacy_id: none
type: non-functional
source: "#98 / PR #110, #131 / PR #133"
status: implemented
priority: Not documented
---

# REQ-0040: Unprivileged container user

## Description

Security / Portability: The system shall run the bridge, Janus and ffmpeg as the unprivileged `node` user (uid 1000) inside the container, migrating existing root-owned `/config` installs without manual steps.

## Rationale

Not documented.

## Acceptance Criteria

- Started as root, the entrypoint hands the config directory, `config.json`, `print-state.json` and `file-sizes.json` (and their `.tmp` files) to `node` (not recursively), keeps `config.json` at mode `0600`, and runs the bridge as `node`.
- If `/config` cannot be made writable for `node` (e.g. NFS root_squash, rootless Docker, read-only mount), the bridge keeps running as root and logs a warning.
- The entrypoint never follows symlinks in `/config` for `chown`/`chmod`, and a symlinked `config.json` does not force the root fallback.

## Related ADRs

None documented.
