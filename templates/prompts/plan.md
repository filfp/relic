# /relic.plan

Use `/relic.plan` to create an implementation plan for your spec. This is a manual process to design the architecture, break down the work into phases, and identify all file and artifact changes needed to implement the spec.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->

## Before you begin

<!-- include: relic snippet validation -->

You are creating an implementation plan for this spec.

<!-- include: relic snippet load-spec-context -->

<!-- include: relic snippet external-reads -->

Then discover relevant shared artifacts:

<!-- include: relic snippet search-knowledge -->

Then run the intersection check before writing anything:

<!-- include: relic snippet intersection-check -->

## Writing the plan

Fill in `specs/{{SPEC_ID}}/plan.md`:

- **Architecture Overview** — high-level approach.
- **Implementation Phases** — concrete ordered steps.
- **File Changes table** — every file to be created or modified.
- **Shared Artifact Changes** — new artifacts to create, existing ones to update.
- **Intersection Notes** — any intersections detected and how they are resolved.

## After the plan is written — changelog (cross-artifact mutations only)

Only write a changelog entry if this plan **amends an existing shared artifact** owned by this
spec. Do not write one when the plan is first created, when only spec.md or plan.md change, or
when only new artifacts are being defined.

If a cross-artifact mutation occurred, run:

```bash
relic write --changelog --payload '{"name":"<spec-id>: Plan updated — <what changed>","slash_command":"/relic.plan","description":"<what changed and why>"}'
```

Do not open or edit `changelog.md` directly.

## HTML Step (conditional)

<!-- include: relic snippet html-mode -->

## What NOT to do

- Do not write a plan that claims ownership of an artifact already owned by another spec.
- Do not skip the intersection check.
- Do not write code.
