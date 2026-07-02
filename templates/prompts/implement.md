# /relic.implement

Use `/relic.implement` to execute the implementation phase of your spec. This is where you work through the tasks defined in `tasks.md`, update shared artifacts as needed, and track progress.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->

## Before you begin

<!-- include: relic snippet validation -->

You are implementing the tasks from the current plan.

<!-- include: relic snippet load-spec-context -->

Work through `tasks.md` in order.

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

<!-- include: relic snippet html-mode -->
