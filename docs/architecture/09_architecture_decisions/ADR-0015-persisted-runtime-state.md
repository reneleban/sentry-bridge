# ADR-0015: Persisted Runtime State Next to the Config File

## Status

Accepted

## Context and Problem Statement

Two pieces of runtime state were lost on every bridge restart:

- **Print identity (#55):** Obico identifies a print by `current_print_ts`. The bridge kept the start time only in memory, so a restart during a print split it into two prints in Obico.
- **File sizes (#122):** PrusaLink's USB file list has no sizes; only the per-file endpoint has them. Looking up hundreds of files again after each restart overloads the printer.

Where should this state survive a restart?

## Decision Drivers

- No database (ADR-0006); the config volume is the only persistent storage.
- A crash mid-write must not leave a corrupt file.
- Losing the state must never break the bridge.

## Considered Options

1. **Keep the state in memory** — status before #55 / #122.
2. **Persist small JSON files in the directory of the config file.**

## Decision Outcome

Chosen: **Option 2**.

- `print-state.json` (`src/obico/print-start-store.ts`): the last PrusaLink job id and the start timestamp assigned to it, plus whether the print was ended.
- `file-sizes.json` (`src/prusalink/file-size-cache.ts`): file sizes keyed by name and date, so only new or changed files are looked up; files no longer listed are dropped.

Both are written to a `.tmp` file and renamed. A missing or corrupt file loads as empty; a failed write is logged, not thrown.

## Consequences

- **Positive:** A restart during a print keeps one print in Obico. Sizes are available immediately after a restart.
- **Negative:** The volume holds more than `config.json`; the entrypoint must hand these files to the `node` user (ADR-0012).
