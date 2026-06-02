# /relic.analyse

Use `/relic.analyse` to perform a non-destructive consistency check on your spec. This is a manual process to identify gaps, misalignments, and areas for improvement in your spec and its artifacts.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->
<!-- include: relic snippet read-only-guard -->

## Before you begin — run these first

<!-- include: relic snippet validation -->

## What to check

1. **Spec completeness** — does `spec.md` have all required sections filled in?
2. **Artifact freshness** — do the files listed in `artifacts.json` actually exist in `shared/`?
3. **Ownership consistency** — is every artifact in `reads` owned by exactly one spec?
4. **Plan alignment** — does `plan.md` reflect the current `spec.md`? Flag divergences.
5. **Cross-spec coherence** — are there any undeclared intersections between specs?

## Output format

Report findings as:

- ✅ [check]: [result]
- ⚠️ [check]: [issue found]
- ❌ [check]: [blocking issue found]

Do not make any changes. Suggest what to run to resolve each issue.
