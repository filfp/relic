# Fix: 2026-05-20-specify-html-step-never-executed

**Date:** 2026-05-20
**Owning spec:** 008-html-spec-mode
**Status:** solved

---

## Issue

When using `mode = "html"`, running `/relic.specify` (and other workflow commands) does not produce any enriched content in the spec's HTML file. The file remains at the scaffold default — the sections are empty even after a full workflow session.

## Root Cause

**Classification:** misspecification

Every prompt template (`specify.md`, `clarify.md`, `plan.md`, `tasks.md`, `implement.md`, `fix.md`, `solve.md`) has its `## HTML Step (conditional)` section appended **after** the `## When done, confirm` checklist and a `---` horizontal rule. The confirm section reads as a terminal point — it presents a completion checklist, and when the AI checks off those items it reports back to the user. The `---` separator reinforces this termination. The HTML step that follows is never reached.

Spec FR-14 stated the HTML step should be *"strictly last — after all Markdown work is complete."* The implementation interpreted "last" as after the confirmation section, but the confirmation section is itself a stopping signal. The HTML step should be the last **work** step, positioned before the confirmation section — not after it. The confirmation section should then include a line confirming the HTML file was updated.

## Proposed Changes

### Spec amendments

`spec.md` FR-14 needs a one-sentence clarification: *"strictly last work step — before `## When done, confirm`, which should include an HTML update item in its checklist."*

### Code changes

In all seven prompt templates, relocate the `## HTML Step (conditional)` section:

- **Before the move:** `[main work] → ## When done, confirm → --- → ## HTML Step (conditional)`
- **After the move:** `[main work] → ## HTML Step (conditional) → ## When done, confirm`

And add a corresponding bullet to each template's confirm/completion checklist:
- `- If mode is "html": `<spec-id>.html` updated with enriched content from this session.`

**Files to update:**
1. `templates/prompts/specify.md` — move HTML step before "When done, confirm"; add HTML item to confirm checklist
2. `templates/prompts/clarify.md` — same
3. `templates/prompts/plan.md` — same (no explicit confirm section but has similar terminal text; insert before it)
4. `templates/prompts/tasks.md` — same
5. `templates/prompts/implement.md` — same
6. `templates/prompts/fix.md` — same (insert before "## Step 8 — Report to the user")
7. `templates/prompts/solve.md` — same

After updating the template source files, run `bun run build:templates` to re-embed them.

## Changelog entry (draft)

```
fix(008): move HTML step before confirm section in all 7 prompt templates — the step was unreachable because it was appended after the terminal "When done, confirm" checklist; AI agents never reached it
```
