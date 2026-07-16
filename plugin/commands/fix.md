---
description: "Diagnose a bug through the owning Relic spec: classification + fix document"
allowed-tools: "Bash(relic *)"
---

<!-- GENERATED from templates/prompts/fix.md by scripts/build-plugin.ts — do not edit. -->

# /relic:fix

`/relic:fix` is the **diagnosis stage** of the two-stage fix pipeline. It identifies the owning
spec, classifies the root cause, creates a fix document, and sets the active fix. It does **not**
apply code changes. Run `/relic:solve` after reviewing the fix document.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->

## Step 0 — Determine output mode (do this first, before any file creation)

<!-- include: relic snippet context-mode-check -->

Fix document path by mode:

| `mode` value | Fix document path            |
| ------------ | ---------------------------- |
| `"html"`     | `.relic/fixes/<fix-id>.html` |
| `"md"`       | `.relic/fixes/<fix-id>.md`   |

Also note the `current_fix` field from the same `relic context` output. If a fix is already active, ask the user whether to proceed with the existing fix or start a new one.

---

## Step 1 — Identify the owning spec

Scan all `specs/*/artifacts.json` files and read the `touches_files` arrays. Do prefix matching
against the file path or code area mentioned in the issue.

**Resolution rules:**

- **No match** → Stop. Report: _"This area is not owned by any spec. Run `/relic:specify` to
  create a spec for this feature before filing a fix."_
- **Single match** → Use that spec.
- **Multiple matches** → Longest prefix wins. If two prefixes are equal length, list them and ask
  the user to confirm.

---

## Step 2 — Load spec context

<!-- include: relic snippet load-spec-context -->

<!-- include: relic snippet external-reads -->

---

## Step 3 — Classify the root cause

Assign exactly one classification:

| Classification     | Meaning                                                        |
| ------------------ | -------------------------------------------------------------- |
| `code-bug`         | Implementation error; spec and contracts are correct           |
| `misspecification` | The spec described the wrong behaviour                         |
| `misunderstanding` | The implementation diverged from a correct spec                |
| `wrong-spec`       | The spec's requirement itself is incorrect or has become stale |

---

## Step 4 — Generate a fix ID

Generate a fix ID: `YYYY-MM-DD-<slug>` where slug is max 6 words, hyphen-separated, derived from
the issue description (e.g. `2026-04-13-null-session-read-on-missing-file`).

---

## Step 5 — Write the fix document

**If `mode = "html"`** (determined in Step 0):

Create `.relic/fixes/<fix-id>.html` as a **fragment**: one `<relic-body>` root containing
semantic tags only — no doctype, no scripts, no styles, no chrome. The embedded viewer
(`relic serve`) renders it; never write page infrastructure into it. Do **not** create
`<fix-id>.md`.

<!-- include: relic snippet viewer-components -->

Required content (all fields from `FixDocumentContract` expressed via components):

- Header: an `<h1>` with a short issue title, then a `<div class="meta">` of `<span>`s
  carrying the fix ID, date, owning spec (`<relic-chip>`),
  `<relic-status value="pending">pending</relic-status>`, and the classification
  (`<relic-chip>`)
- **Issue** — prose description inside a `<relic-section>`
- **Root Cause** — `<relic-callout type="info">` with classification badge and explanation
- **Proposed Changes** — `<relic-flow>` for code-change flow; `<relic-table>` for affected files
- **Spec / shared artifact amendments** — `<relic-callout>` per amendment (if any)
- **Changelog entry (draft)** — verbatim `<pre>` code block

Run `relic validate` afterwards — it lints fragments; unknown tags or malformed attributes
degrade to inline viewer warnings, never a broken page.

**If `mode = "md"`** (determined in Step 0):

Create `.relic/fixes/<fix-id>.md` using the `FixDocumentContract` schema exactly:

```markdown
# Fix: <fix-id>

**Date:** YYYY-MM-DD
**Owning spec:** <owning-spec-id>
**Status:** pending

---

## Issue

<The original issue description as reported by the user — verbatim or paraphrased.>

## Root Cause

**Classification:** code-bug | misspecification | misunderstanding | wrong-spec

<Explanation of why this classification was chosen, grounded in the spec context.>

## Proposed Changes

### Code changes

<List of files and what changes are needed. Not the actual code — the description.>

### Spec amendments

<Only present if classification is misspecification, misunderstanding, or wrong-spec.
Describe what needs to change in spec.md and/or plan.md.>

### Shared artifact changes

<Only present if a contract or domain artifact needs updating. List which artifacts
and what changes. Identify all specs in reads[] that will be affected.>

## Changelog entry (draft)

<Draft changelog entry for .relic/changelog.md. /relic:solve will write this verbatim.>
```

Do **not** create `<fix-id>.html` when mode is `"md"`.

---

## Step 6 — Register the fix in `fixes/manifest.toon`

```bash
relic write --fixes --payload '{"name":"<fix-title>","file":"<fix-id>.md","description":"<one-sentence summary of the issue>","tags":["<classification>","<owning-spec-id>"]}'
```

Do not open or edit `fixes/manifest.toon` directly.

---

## Step 7 — Activate the fix

```bash
relic use --fix <fix-id>
```

---

## Step 8 — Report to the user

Output:

1. **Mode:** `html` or `md` — the fix document format used
2. **Owning spec:** which spec owns the affected code area
3. **Classification:** one of the four categories with a brief rationale
4. **Fix document:** path to the created fix doc (`.relic/fixes/<fix-id>.html` or `.md`)
5. **Next step:** _"Review the fix document, then run `/relic:solve` to apply the changes. If the
   classification is `misspecification` or `misunderstanding`, run `/relic:clarify` after solving
   to update the spec."_
