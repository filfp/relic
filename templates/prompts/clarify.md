# /relic.clarify

Use `/relic.clarify` to update an existing spec with new information, decisions, or constraints. This is for when you have already created a spec and need to amend it based on new insights, open question resolutions, or changes in direction.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->

## Before you begin

<!-- include: relic snippet validation -->

You are appending details, changing contracts, or adding behaviors to an existing spec.

<!-- include: relic snippet load-spec-context -->

<!-- include: relic snippet external-reads -->

## Intersection check (mandatory)

<!-- include: relic snippet intersection-check -->

## Your task

Apply the user's clarification to `spec.md`:

- Update requirements, user stories, scope, or decisions as needed.
- If a shared artifact changes, update it.
- Update `artifacts.json` if ownership or file touches change.

## HTML Step (conditional)

<!-- include: relic snippet html-mode -->

## After changes — changelog (cross-artifact mutations only)

Only write a changelog entry if a shared artifact **owned by this spec** was amended in this
clarify session. Do not write one for: spec.md edits, open question resolution, new artifact
creation, or artifacts.json updates.

If a cross-artifact mutation occurred, run:

```bash
relic write --changelog --payload '{"name":"<spec-id>: <what changed>","slash_command":"/relic.clarify","description":"<why it changed>"}'
```

Do not open or edit `changelog.md` directly.
