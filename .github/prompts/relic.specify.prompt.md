---
description: Relic specify command
---

# /relic.specify

> **Before proceeding:** Read `.relic/preamble.md`. It defines where artifacts belong.
> Violating those rules cannot be undone by a changelog entry.

## Before you begin — Step 0: derive the spec title

Read the user's input (description, PRD snippet, or user story).
Extract a short, clear feature name — 2–4 words, title case, no punctuation.
Examples: "User History", "Checkout Flow", "Auth Token Refresh".

## Before you begin — Step 1: scaffold the spec

```bash
relic scaffold --title "<derived title>"
```

This generates the spec ID, creates the folder, and writes empty scaffolding for
`spec.md`, `plan.md`, `tasks.md`, and `artifacts.json`. Use the `spec_id` from the
JSON output for all subsequent file references — do not infer it from anywhere else.

You are helping create a new spec for this project.

## Before you begin — Step 2: load context

1. Read `.relic/constitution.md` — understand the governing rules.
2. Read the newly created `spec.md` from the path in the scaffold output.
3. Discover relevant shared artifacts using the two-step cascade:

   **Step A — targeted search (preferred):**
   From the user's input, extract up to 10 keywords (domain terms, entity names, technical concepts). Run:
   ```bash
   relic search <keyword1> <keyword2> ...
   ```
   Read the returned entries. For candidates with a high `score`, read the full artifact file.
   If the results cover the domain well enough to identify overlaps and dependencies, stop here.

   **Step B — full brain scan (fallback, only if Step A is insufficient):**
   ```bash
   relic search --deep
   ```
   Read only the `tldr` field of each result. Identify which artifacts are relevant to this spec,
   then read those full files. Do not read all files indiscriminately.

## Your task

The user will provide a PRD, user story, or verbal description of the feature.
Help them fill in `.relic/specs/{{SPEC_ID}}/spec.md`.

### Steps

1. Write a clear **Overview** paragraph: what this feature does and why it exists.
2. Extract **Functional Requirements** (what the system must do) and
   **Non-Functional Requirements** (performance, security, constraints).
3. Write **User Stories** in the format: *As a [role], I want [capability] so that [benefit]*.
4. Define **Scope** — what is explicitly in scope and out of scope.
5. Identify **Shared Artifacts** this spec should own or read:
   - Use `relic search <keywords>` to find existing artifacts by domain terms before scanning directories directly.
   - Propose new shared artifacts where needed.
   - Do NOT claim ownership of an artifact already owned by another spec.
6. Update `artifacts.json` with the correct `owns`, `reads`, and `touches_files` arrays.
7. Flag any open questions in the **Open Questions** section.

## Intersection check

Before writing `artifacts.json`, check:
- Which files will this feature touch (`touches_files`)?
- Do any existing `specs/*/artifacts.json` files claim `owns` of the same files or artifacts?
- If yes, flag the conflict in **Open Questions** — do NOT claim conflicting ownership.

## After spec is written — register in spec index

Run:
```bash
relic search --deep --spec
```

Then register the new spec entry by running:

```bash
relic write --specs --payload '{"name":"<spec title>","file":"<spec-id>/","description":"<one-sentence tldr from Overview>","tags":["<tag1>","<tag2>","..."]}'
```

Populate `tags` (4–8 lowercase keywords from the spec domain) and `description` (one sentence from
the Overview). You do not need to read other specs — only add your own entry.
Do not open or edit `specs/manifest.toon` directly.

## What NOT to do

- Do not create a `plan.md` — that is the `plan` step.
- Do not write code.
- Do not modify shared artifacts owned by another spec.

## HTML Step (conditional)

Run:
```bash
relic context
```

If `mode` is `"html"`:

1. Read `.relic/base.html` — open the `<template id="relic-docs">` element for the component inventory.
2. Read `<spec-id>.html` in the spec directory (path is in the `relic scaffold` output from Step 1).
3. Update it with **synthesised** content reflecting the work done in this session.
   **Anti-transcription rules (mandatory):**
   - Do NOT copy Markdown text verbatim into the HTML.
   - Replace bullet lists of steps with a `<relic-flow>` diagram.
   - Replace prose describing tabular data with a `<relic-table>`.
   - Replace "3 of 5 tasks complete" with `<relic-progress>`.
   - Use `<relic-chip>` for inline metadata instead of parenthetical text.
   - If a section would look identical to the Markdown source, you are doing it wrong — find a visual form.
   - Use `var(--text)`, `var(--surface)`, `var(--border)` for any custom CSS so dark mode works.
4. Populate the inline reader source blocks with the **current** content of the three Markdown files:
   - Replace the content of `<script type="text/plain" id="relic-src-spec">` with the full text of `spec.md`.
   - Replace the content of `<script type="text/plain" id="relic-src-plan">` with the full text of `plan.md` (use empty string if the file does not exist yet).
   - Replace the content of `<script type="text/plain" id="relic-src-tasks">` with the full text of `tasks.md` (use empty string if the file does not exist yet).
   These source blocks power the nav link reader — clicking a header nav link renders the file inline from these blocks.
5. Write the updated `<spec-id>.html` back.

If `mode` is `"md"`, skip this step entirely.

## When done, confirm

- `spec.md` is complete and clear.
- `artifacts.json` is populated with correct `owns`, `reads`, `touches_files`.
- New spec entry written via `relic write --specs` (confirmed by JSON output).
- Any intersection concerns are flagged in Open Questions.
- If mode is `"html"`: `<spec-id>.html` updated with enriched content from this session.
