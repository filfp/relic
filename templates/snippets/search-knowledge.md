Use a **directional, tag-led search first**. Fall back to a full brain scan only if the directional pass does not yield enough to act on.

**Step A — directional search (always start here):**

Extract up to 10 keywords from the task at hand — domain terms, entity names, technical concepts. Prefer specific nouns over generic verbs. Run:

```bash
relic search <keyword1> <keyword2> ...
```

Each result line is: `<source> | <name> | <path> | <tags> | <tldr> | <score>`.

For results with `score ≥ 1`, read the full file at `<path>` (relative to `.relic/`). Prioritise higher score first. If two scores tie, prefer `knowledge` over `spec`, and `spec` over `fix`. Stop reading once the returned candidates are enough to act on.

**Step B — full brain scan (fallback, only if Step A returned nothing useful):**

```bash
relic search --deep
```

This returns every entry across all categories. Read only the `tldr` field to triage candidates, then open only the files where the `tldr` is clearly relevant. Do not read all files indiscriminately.
