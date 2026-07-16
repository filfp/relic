# /relic:tasks

Use `/relic:tasks` to create a task list for the implementation phase of your spec. This is where you break down the work into concrete, actionable items that can be checked off as you go.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->

## Before you begin

<!-- include: relic snippet validation -->

You are generating a task list from the current implementation plan.

<!-- include: relic snippet load-spec-context -->

<!-- include: relic snippet external-reads -->

Then check other specs' `tasks.md` files for overlap (same files being modified in parallel).

## Task overlap check

If another spec's tasks touch the same files:

- Flag the overlap explicitly in the **Notes** section of `tasks.md`.
- Do not block progress — flag it so the implementer is aware.

## Writing tasks

Fill in `specs/{{SPEC_ID}}/tasks.md`:

- Break each implementation phase into concrete, atomic tasks.
- Each task should be independently completable (one file or one concern).
- Order tasks so dependencies come first.
- Prefix tasks that depend on other specs with `[blocked by: <spec-id>]`.

## HTML Step (conditional)

<!-- include: relic snippet html-mode -->

## What NOT to do

- Do not write code.
- Do not modify `plan.md` — if the plan is wrong, run `/relic:plan` again.
