# /relic:specify

Use `/relic:specify` to write a new feature spec. This is a manual process to extract requirements from the user's input, identify relevant shared artifacts, and populate the spec's `spec.md` and `artifacts.json`.

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->

## Before you begin

Read the user's input (description, PRD snippet, or user story).
Extract a short, clear feature name — 2–4 words, title case, no punctuation.
Examples: "User History", "Checkout Flow", "Auth Token Refresh".

<!-- include: relic snippet scaffold -->

You are helping create a new spec for this project.

1. Read the newly created `spec.md` from the path in the scaffold output.
2. Discover relevant shared artifacts:

<!-- include: relic snippet search-knowledge -->

<!-- include: relic snippet external-reads -->

## Your task

The user will provide a PRD, user story, or verbal description of the feature.
Help them fill in `.relic/specs/{{SPEC_ID}}/spec.md`.

### Steps

1. Write a clear **Overview** paragraph: what this feature does and why it exists.
2. Extract **Functional Requirements** (what the system must do) and
   **Non-Functional Requirements** (performance, security, constraints).
3. Write **User Stories** in the format: _As a [role], I want [capability] so that [benefit]_.
4. Define **Scope** — what is explicitly in scope and out of scope.
5. Identify **Shared Artifacts** this spec should own or read:
   - Use `relic search <keywords>` to find existing artifacts by domain terms before scanning directories directly.
   - Propose new shared artifacts where needed.
   - Do NOT claim ownership of an artifact already owned by another spec.
6. Update `artifacts.json` with the correct `owns`, `reads`, and `touches_files` arrays.
7. Flag any open questions in the **Open Questions** section.

## Intersection check

<!-- include: relic snippet intersection-check -->

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

<!-- include: relic snippet html-mode -->

## When done, confirm

- `spec.md` is complete and clear.
- `artifacts.json` is populated with correct `owns`, `reads`, `touches_files`.
- New spec entry written via `relic write --specs` (confirmed by JSON output).
- Any intersection concerns are flagged in Open Questions.
- If mode is `"html"`: `<spec-id>.html` updated with enriched content from this session.
