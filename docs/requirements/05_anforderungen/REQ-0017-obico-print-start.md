---
id: REQ-0017
legacy_id: SRS-017
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0017: Print start from Obico

## Description

The system shall accept print-start commands from Obico (`start_printer_local_print`, `file_downloader.download`, and `_printer.select_file`) and relay them to PrusaLink.

## Rationale

Not documented.

## Acceptance Criteria

- A print initiated from the Obico file library or control panel starts on the printer within 10 s.
- Obico's "OctoPrint" file dialog: passthru `_file_manager.list_files` is answered with `{ ref, ret: { local: { <name>: <OctoPrint file entry> } } }` built from the PrusaLink USB files (flat; `path`/`recursive`/`level` ignored; `filter` is a case-insensitive substring match on name or display name; all matching files, newest first; each entry's `name` and `path` are the long display name, because Obico links a file's detail page by `path` and looks it up by `name`).
- PrusaLink's file list has no sizes, so sizes come from a shared cache keyed by name + date (also used by `GET /api/files`), persisted atomically (temp file + rename, debounced) in `file-sizes.json` next to the config file and loaded at start, so only new or changed files are ever looked up; entries for files no longer listed are dropped on the next listing.
- Listings never wait; uncached sizes are looked up in the background (`GET /api/v1/files/usb/<name>`) strictly one at a time with a 500 ms pause between lookups; a failed or timed-out lookup stops the queue for 60 s (the file is retried afterwards).
- Unknown sizes are reported as 0 to Obico (`null` in `/api/files`); each newly known size is pushed as SSE `event: file-size` `{ name, size }` and `event: file-size-progress` `{ known, total }` on `/api/status/stream`; `/api/files` includes `sizeProgress { known, total }`.
- The PrusaLink file list is cached for 30 s, concurrent callers share one in-flight request, and uploads/deletes invalidate it.
- The cache is warmed in the background at bridge start.
- The dashboard file browser shows the 10 newest files plus a search over all files (display name or name) and a size progress bar while sizes are incomplete.
- A PrusaLink listing failure returns `{ ref, error }`.
- `_printer.select_file` with `args[0]` a listed display name (or PrusaLink name), mapped back to the PrusaLink name, and `printAfterSelect` `true`/`'true'` starts that file; a path that is not a bare filename (e.g. containing `/` or `..`) returns `{ ref, error: "invalid path" }`, and selecting without `printAfterSelect` returns an error (PrusaLink has no selected-file state); neither prints.

## Related ADRs

None documented.
