**External spec documents (skip if none):** inspect the `external_reads` array in the
`relic context` output you already have (re-run `relic context --spec <your-spec-id>` if needed).

- If `external_reads` is empty or absent — this spec has no external dependencies. Continue.
- If **any** entry has `exists: false` or an `error` field — **STOP immediately.** Do not perform
  any other work. Report the broken entries to the user verbatim (entry, resolved path, reason)
  and suggest the fix: restore the file in the spec repo, correct the entry via `artifacts.json`,
  or configure the type with `relic external set <type> <path>`. Broken external reads never
  produce degraded or partial output — they must be fixed first.
- Otherwise, read **every** file listed in `external_reads` (use each entry's `resolved_path`)
  before your main work. These are the team's canonical requirements (FR/NFR/BR), decisions
  (ADR), user stories, and epics — incorporate their constraints, decisions, and language into
  everything you produce.

**Editing external documents:** you may edit these files when the session's changes genuinely
affect them (e.g. a contract change invalidates an ADR consequence) — never delete them, and
never rewrite history. After editing, commit in the spec repo on the current branch with a
descriptive message; the document owner reviews and merges. To capture a NEW requirement or
decision discovered during this session, use `relic external create <type> "<title>"` — it
numbers, formats, commits, and links the document automatically.
