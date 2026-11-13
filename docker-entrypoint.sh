#!/bin/sh
# Runs the bridge as the unprivileged "node" user (#98).
#
# Started as root (the default), it first hands the config directory and the
# files the bridge writes to "node", so existing installs with a root-owned
# /config keep working without manual steps. Only these paths are changed, never
# recursively: /config can be a bind mount that holds unrelated files.
#
# If ownership cannot be changed (NFS root_squash, rootless Docker, read-only
# mount) and "node" cannot write /config, the bridge keeps running as root and
# logs a warning instead of failing.
#
# Symlinks are never followed (#131): /config is writable by "node", so a link
# planted there must not redirect root's chown/chmod or force the root fallback.
set -e

RUN_USER=node
CONFIG_FILE="${CONFIG_PATH:-/config/config.json}"
CONFIG_DIR="$(dirname "$CONFIG_FILE")"

if [ "$(id -u)" != "0" ]; then
  exec "$@"
fi

mkdir -p "$CONFIG_DIR" 2>/dev/null || true

for p in "$CONFIG_DIR" "$CONFIG_FILE" "$CONFIG_DIR/print-state.json" "$CONFIG_DIR/print-state.json.tmp" \
  "$CONFIG_DIR/file-sizes.json" "$CONFIG_DIR/file-sizes.json.tmp"; do
  # Never follow symlinks: /config is writable by "node", so a link here could
  # point root's chown at an arbitrary file (#131).
  [ ! -L "$p" ] || continue
  [ -e "$p" ] || continue
  if [ "$(stat -c %u "$p")" != "$(id -u "$RUN_USER")" ]; then
    chown "$RUN_USER:$RUN_USER" "$p" 2>/dev/null || true
  fi
done
if [ -f "$CONFIG_FILE" ] && [ ! -L "$CONFIG_FILE" ]; then
  chmod 600 "$CONFIG_FILE" 2>/dev/null || true
fi

# A symlinked config file does not count against running unprivileged:
# otherwise "node" could force the root fallback by linking it to a file it
# cannot write (#131).
if su-exec "$RUN_USER" test -w "$CONFIG_DIR" \
  && { [ ! -e "$CONFIG_FILE" ] || [ -L "$CONFIG_FILE" ] \
    || su-exec "$RUN_USER" test -w "$CONFIG_FILE"; }; then
  exec su-exec "$RUN_USER" "$@"
fi

echo "[entrypoint] WARNING: $CONFIG_DIR is not writable for user '$RUN_USER' and its ownership could not be changed — running as root. Make $CONFIG_DIR writable for uid $(id -u "$RUN_USER") to run unprivileged." >&2
exec "$@"
