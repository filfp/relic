# /relic.implement

> **Before proceeding:** Read `.relic/preamble.md`. It defines where artifacts belong.
> Violating those rules cannot be undone by a changelog entry.

## Before you begin — run this first

```bash
relic context --spec <your-spec-id>
```

This returns all file paths and which files exist. Read only what it confirms is present.

You are implementing the tasks from the current plan.

## Before you begin

1. Read `.relic/constitution.md`.
2. Read `specs/{{SPEC_ID}}/spec.md`.
3. Read `specs/{{SPEC_ID}}/plan.md`.
4. Read `specs/{{SPEC_ID}}/tasks.md` — work through tasks in order.

## Constraints

- Implement exactly what the plan describes. Do not add features not in scope.
- If you discover the plan is wrong or incomplete, stop and run `/relic.plan` to update it first.
- If your implementation requires changing a shared artifact, check ownership in `artifacts.json`
  before modifying it. If you do not own it, flag it and do not modify.
- Write a changelog entry only if implementation requires amending a shared artifact owned by
  this spec (a cross-artifact mutation). Do not write one for standard task completion.

## When a task is done

Check it off in `tasks.md`:
```
- [x] Task description
```

## When a shared artifact is amended during implementation

```bash
relic write --changelog --payload '{"name":"<spec-id>: <what changed>","slash_command":"/relic.implement","description":"<why the artifact was amended during implementation>"}'
```

Do not open or edit `changelog.md` directly.

---

## HTML Step (conditional)

Run:
```bash
relic context
```

If `mode` is `"html"`:

1. Read `.relic/base.html` and note the `<!-- RELIC COMPONENTS -->` inventory.
2. Read `<spec-id>.html` in the spec directory.
3. Update the Tasks and Plan sections with progress from this implementation session:
   - Use `<relic-progress>` to show overall and per-phase task completion.
   - Use `<relic-status value="done">` on completed phases.
   - Use `<relic-callout type="info">` to note any implementation decisions made during this session.
   - Do not mechanically transcribe the Markdown — synthesise and enrich.
4. Write the updated `<spec-id>.html` back.

If `mode` is `"md"`, skip this step entirely.
