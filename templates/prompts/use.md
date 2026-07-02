# /relic:use

Switch the active spec or fix for this session. Works from any AI session — including remote
sessions (Claude.ai, Copilot Chat) where the user has no terminal access.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->

## Step 1 — Detect the argument type

The user will say something like:

- `"switch to spec 002-payments"` — spec ID (`NNN-slug` format)
- `"use spec 001-auth"`
- `"activate fix 2026-04-13-null-session-read"` — fix ID (`YYYY-MM-DD-*` format)
- `"clear the active fix"`

**If the argument matches `YYYY-MM-DD-*` (fix ID format):**
→ Go to **Fix activation** below.

**If the argument is "clear fix" or "clear the active fix":**
→ Go to **Clear fix** below.

**Otherwise (spec ID or spec name):**
→ Go to **Spec activation** below.

---

## Fix activation

Run:

```bash
relic use --fix <fix-id>
```

This validates `.relic/fixes/<fix-id>.md` exists and writes the fix ID to `session.json`.

After activation, report:

- **Active fix:** `<fix-id>`
- **Owning spec:** read from the fix document (`**Owning spec:**` field)
- **Status:** read from the fix document (`**Status:**` field)
- **Next step:** _"Run `/relic:solve` to apply the proposed changes."_

---

## Clear fix

Run:

```bash
relic use --clear-fix
```

Report: _"Active fix cleared."_

---

## Spec activation

Extract the spec ID (in `NNN-slug` format) from the user's message and run:

```bash
relic scaffold --spec <spec-id>
```

This updates `session.json` so all subsequent Relic commands resolve to the spec you just
activated.

After switching, report:

- **Active spec:** the `spec_id` from the JSON output
- **Title:** derived from the spec ID
- **Files ready:** which of `spec.md`, `plan.md`, `tasks.md` exist (from `files_created` — empty means all existed)
- **Suggested next step:** based on what exists
  - If `spec.md` is empty or new → `/relic:specify`
  - If `plan.md` is empty or new → `/relic:plan`
  - If `tasks.md` is empty or new → `/relic:tasks`
  - If all exist → `/relic:implement` or `/relic:fix`

## If spec ID not found

If the user gives an ambiguous name (not in `NNN-slug` format), list available specs first:

```bash
ls .relic/specs/
```

Then ask the user to confirm which one they mean before switching.
