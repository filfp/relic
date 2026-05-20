---
description: Relic tasks command
---

# /relic.tasks

> **Before proceeding:** Read `.relic/preamble.md`. It defines where artifacts belong.
> Violating those rules cannot be undone by a changelog entry.

## Before you begin — run this first

```bash
relic scaffold --spec <your-spec-id>
```

This ensures the spec folder and all files exist, creating any that are missing.
Check `files_created` in the output — if `plan.md` was just created, run `/relic.plan` first.

You are generating a task list from the current implementation plan.

## Before you begin

1. Read `.relic/constitution.md`.
2. Read `specs/{{SPEC_ID}}/spec.md`.
3. Read `specs/{{SPEC_ID}}/plan.md` — this is your source of truth.
4. Check other specs' `tasks.md` files for overlap (same files being modified in parallel).

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

Run:
```bash
relic context
```

If `mode` is `"html"`:

1. Read `.relic/base.html` — open the `<template id="relic-docs">` element for the component inventory.
2. Read `<spec-id>.html` in the spec directory.
3. Update the Tasks section with **synthesised** content from this session.
   **Anti-transcription rules (mandatory):**
   - Do NOT copy the task checklist verbatim as an HTML list.
   - Use `<relic-progress>` per phase to show completion ratios at a glance.
   - Use `<relic-table>` for the task list (ID, description, status as `<relic-chip>`).
   - Group tasks by phase; use `<relic-status>` on each phase heading.
   - If a section would look identical to the Markdown source, you are doing it wrong.
   - Use `var(--text)`, `var(--surface)`, `var(--border)` for any custom CSS so dark mode works.
4. Populate the inline reader source blocks with the **current** content of the three Markdown files:
   - Replace the content of `<script type="text/plain" id="relic-src-spec">` with the full text of `spec.md`.
   - Replace the content of `<script type="text/plain" id="relic-src-plan">` with the full text of `plan.md` (empty string if not yet created).
   - Replace the content of `<script type="text/plain" id="relic-src-tasks">` with the full text of `tasks.md`.
5. Write the updated `<spec-id>.html` back.

If `mode` is `"md"`, skip this step entirely.

## What NOT to do

- Do not write code.
- Do not modify `plan.md` — if the plan is wrong, run `/relic.plan` again.
