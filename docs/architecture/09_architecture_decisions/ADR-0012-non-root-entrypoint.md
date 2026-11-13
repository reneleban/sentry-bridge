# ADR-0012: Non-Root Container via su-exec Entrypoint with Symlink Guard

## Status

Accepted

## Context and Problem Statement

The container ran as root (#91, item F8; split out as #98). A plain `USER node` breaks Linux hosts because of bind-mount ownership: Docker creates a missing `./config` as root, so the wizard cannot save `config.json`, and existing installs have a root-owned `/config`. Later (#131) the entrypoint, which runs as root, was found to follow symlinks: the `node` user owns `/config` and could plant a link that redirects root's `chmod`. How should the bridge drop root without breaking existing volumes?

## Decision Drivers

- The bridge and the bundled Janus must run unprivileged.
- Fresh installs and upgrades of root-owned volumes must work without a manual `chown`.
- Root must never act on a path the unprivileged user can redirect.

## Considered Options

1. **`USER node` in the Dockerfile** — breaks root-owned bind mounts.
2. **Root entrypoint that fixes ownership, then drops privileges with `su-exec`.**

## Decision Outcome

Chosen: **Option 2** (`docker-entrypoint.sh`, `su-exec` installed in the image).

Started as root, the entrypoint hands the config directory, `config.json`, `print-state.json`, `file-sizes.json` and their `.tmp` files to `node` (uid 1000 from `node:26-alpine`), never recursively, sets `config.json` to mode `0600`, and `exec`s the command as `node`. Symlinks are skipped for every path and for the `chmod` (#131); a symlinked config file does not force the root fallback. If ownership cannot be changed (NFS `root_squash`, rootless Docker, read-only mount) and `node` cannot write `/config`, the bridge keeps running as root and logs a warning. Started as non-root, the entrypoint `exec`s the command directly.

## Consequences

- **Positive:** Bridge, ffmpeg and Janus run as `node`. Existing root-owned volumes keep working. A compromised bridge process cannot use the entrypoint to change files outside `/config`.
- **Negative:** On setups where `/config` cannot be handed to `node`, the container silently (warning only) keeps running as root (see R-07 in chapter 11).
- **Constraint:** New files the bridge persists in `/config` must be added to the entrypoint's ownership list.
