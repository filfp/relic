# /relic.implement

<!-- include: relic snippet preamble-guard -->

## Before you begin — run this first

```bash
relic context --spec <your-spec-id>
```

This returns all file paths and which files exist. Read only what it confirms is present.

You are implementing the tasks from the current plan.

## Before you begin

<!-- include: relic snippet constitution-load -->
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

## HTML Step (conditional)

Run:
```bash
relic context
```

If `mode` is `"html"`:

1. Read `.relic/base.html` — open the `<template id="relic-docs">` element for the component inventory.
2. Read `<spec-id>.html` in the spec directory.
3. Update Tasks and Plan sections with **synthesised** progress from this implementation session.
<!-- include: relic snippet html-anti-transcription-common -->
   - Use `<relic-progress>` for overall and per-phase completion (values from actual task counts).
   - Mark completed phases with `<relic-status value="done">` on the phase heading.
   - Use `<relic-callout type="info">` for decisions made during implementation; `type="warn"` for deviations from plan.
   - Use `<relic-chip color="green">done</relic-chip>` inline per completed task in the table.
<!-- include: relic snippet html-inline-reader -->
5. Write the updated `<spec-id>.html` back.

If `mode` is `"md"`, skip this step entirely.
