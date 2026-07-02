# /relic:solve

`/relic:solve` is the **application stage** of the two-stage fix pipeline. It reads the active fix
document (created by `/relic:fix`), applies the proposed code changes, updates the knowledge layer
if needed, and closes the fix. Run `/relic:fix <issue>` first if no fix is active.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->

## Step 1 — Read session state

<!-- include: relic snippet context-mode-check -->

Also read the `current_fix` field from the same `relic context` output:

- **`current_fix` is null** → Stop. Report: _"No active fix. Run `/relic:fix <issue>` first to diagnose the issue and create a fix document."_
- **`current_fix` is set** → Continue. The fix document is at `.relic/fixes/<current_fix>.html` (mode `html`) or `.md` (mode `md`).

---

## Step 2 — Load the fix document

**If `mode = "html"`:** Read `.relic/fixes/<current_fix>.html` in full.
**If `mode = "md"`:** Read `.relic/fixes/<current_fix>.md` in full.

Note:

- **Owning spec** — which spec governs this fix
- **Classification** (under Root Cause) — `code-bug | misspecification | misunderstanding | wrong-spec`
- **Code changes** (under Proposed Changes) — the code changes to apply
- **Shared artifact changes** (under Proposed Changes) — which shared artifacts (if any) need updating

---

## Step 3 — Load spec context

<!-- include: relic snippet load-spec-context -->

---

## Step 4 — Apply code changes

Apply the changes described in the **Proposed changes** section of the fix document. Follow the
constraints from the spec and loaded shared artifacts.

If you discover during application that the proposed changes are insufficient or incorrect, update
the fix document's **Proposed changes** section before proceeding.

---

## Step 5 — Update the knowledge layer (if required)

**If classification is `misspecification`, `misunderstanding`, or `wrong-spec`:**

- Amend `specs/<owning-spec>/spec.md` to reflect the corrected understanding.
- If the architecture was also affected, update `specs/<owning-spec>/plan.md`.

**If contract impact is not "None":**

- Update each affected shared artifact file in `shared/`.
- For each updated artifact, scan all `specs/*/artifacts.json` for `reads` entries that reference
  it. In each affected spec's `spec.md`, append to Open Questions:
  `[!] Shared artifact [name] updated by fix <fix-id>. Review required.`
- Tell the user which specs need a follow-up `/relic:clarify`.

---

## Step 6 — Write changelog entry (cross-artifact mutations only)

Only write a changelog entry if the fix **amended a spec, contract, domain, or rule** (i.e. a
cross-artifact mutation occurred). Do not write one when the fix touched only source code.

If a cross-artifact mutation occurred, run:

```bash
relic write --changelog --payload '{"name":"<owning-spec> / <fix-id>: <what was changed>","slash_command":"/relic:solve","description":"<brief description of what was fixed and what artifact was amended>"}'
```

Use the **Changelog draft** from the fix document as the basis for the `description` field.
Do not open or edit `changelog.md` directly.

---

## Step 7 — Close the fix

**If `mode = "html"`:**

- Update `.relic/fixes/<current_fix>.html`: replace `<relic-status value="pending">` with
  `<relic-status value="done">solved</relic-status>`, mark proposed changes as applied, add a
  "Resolved" section with a brief note on what was changed.
- Do **not** modify or create `<current_fix>.md` — it does not exist in html mode.

**If `mode = "md"`:**

- Set `Status: solved` in `.relic/fixes/<current_fix>.md` (change the `**Status:** pending` line).
- Do not create or modify any `.html` file.

Then clear the active fix:

```bash
relic use --clear-fix
```

---

## Step 8 — Report to the user

Output:

1. **Files changed** — list of code files modified
2. **Knowledge layer updates** — spec/plan/shared artifact changes made (or "none")
3. **Changelog entry** — the entry written to `changelog.md` (or "none — no cross-artifact mutation")
4. **Follow-up required** — list of specs needing `/relic:clarify` (or "none")
