# Spec: Prompt Snippet Injection

**Spec ID:** 010-prompt-snippet-injection
**Created:** 2026-05-25
**Status:** draft

---

## Overview

The 12 prompt templates in `templates/prompts/` suffer from static content duplication — the same preamble guard, HTML rules, and inline reader instructions appear verbatim across 6–10 files. A one-line change to any of these blocks requires editing up to 10 files.

This spec delivers **Track 1 — Snippet injection (LLM-runtime composition):** a `templates/snippets/` directory of named Markdown fragments. Templates reference snippets with `<!-- include: relic snippet <name> -->` directives. These directives are **not resolved at build time** — they travel verbatim in the baked template and the LLM resolves them at runtime by calling `relic snippet <name>`. Snippets may compose other snippets via nested directives, enabling reusable building blocks of any complexity.

**Track 2 (Skill extraction)** is a separate concern handled by spec 011-skill-extraction.

The principle for this spec: **static text → snippets.**

---

## Delivery Track Classification

| Block | Current state | Track | Rationale |
|---|---|---|---|
| Preamble guard (2-line blockquote) | Verbatim in 6 templates | **Snippet** | Pure static text, no decision logic |
| Preamble guard extended (fix.md) | Verbatim in 1 template | **Snippet** | Same — slightly different static text |
| "Read `.relic/constitution.md`" instruction | Verbatim in 5 templates | **Snippet** | 1-line static instruction |
| HTML mode check + outer step skeleton | Verbatim in 5 templates | **Snippet** | Static structural instructions |
| HTML anti-transcription common rules | Verbatim in 5 templates | **Snippet** | Static rules |
| HTML inline reader source blocks | Verbatim in 5 templates | **Snippet** | Static population instructions |

---

## Audit — Initial Snippet Set

| Snippet file | Content | Lines saved |
|---|---|---|
| `preamble-guard.md` | Standard preamble blockquote | 2 lines × 6 templates = 12 |
| `preamble-guard-extended.md` | Extended version (fix.md only) | 4 lines × 1 template = 4 |
| `constitution-load.md` | "Read `.relic/constitution.md`" instruction | 1 line × 5 templates = 5 |
| `html-inline-reader.md` | Source block population instructions | ~8 lines × 5 templates = 40 |
| `html-anti-transcription-common.md` | 3 universal anti-transcription rules | 3 lines × 5 templates = 15 |

~76 lines of duplication eliminated. Each change to these blocks touches 1 file instead of up to 6.

---

## Requirements

### Functional

- **FR-1:** A `templates/snippets/` directory holds named Markdown fragment files. Each file is a self-contained block of prompt text (no front-matter, no directives — plain Markdown).
- **FR-2:** Any template in `templates/prompts/` may reference a snippet using `<!-- include: relic snippet <name> -->`, where `<name>` is the snippet's registered identifier (filename without `.md`). The directive must appear on its own line. It is an LLM instruction, not a build-time substitution — the LLM reads it and calls `relic snippet <name>` to load the snippet content into its working context.
- **FR-3:** `scripts/embed-engine-templates.ts` bakes templates into `ENGINE_TEMPLATES` **as-is**. `<!-- include: relic snippet <name> -->` directives are preserved verbatim in the baked output and in the `.claude/commands/` files written to user projects. No directive resolution occurs at build time. The embed script change for snippet support is minimal: it only needs to bake the `SNIPPETS` registry (see FR-14). Adding skill standalone entries to ENGINE_TEMPLATES is out of scope for this spec (see 011).
- **FR-4:** Snippets are **not** added as standalone entries in `ENGINE_TEMPLATES`. They are accessed at runtime via `relic snippet <name>`.
- **FR-5:** `relic snippet <name>` with an unknown name exits with a non-zero code and an error message. There is no build-time validation of directive names — errors surface when the LLM attempts to load the snippet.
- **FR-6:** After extraction, every `<!-- include: relic snippet <name> -->` in a template must produce the same effective content as the verbatim block it replaced when the LLM resolves it — no behavioural changes, only source consolidation.
- **FR-7:** Snippets may themselves contain `<!-- include: relic snippet <name> -->` directives, enabling composition: complex reusable blocks built from simpler primitives. No variable substitution (`{{PLACEHOLDER}}`-style tokens) is supported — composition via inclusion only. The LLM resolves nested directives depth-first. Circular references are detected: if snippet A includes snippet B which includes snippet A, `relic snippet` must report an error.
- **FR-14:** A `relic snippet <name>` CLI command outputs the content of a named snippet to stdout. The LLM calls this during template execution to load snippet content; developers may also call it directly to inspect snippets. Snippets are baked into the CLI binary (as a `SNIPPETS` map by `scripts/embed-engine-templates.ts`) — the command reads from that registry, not from loose files on disk. Unknown name → non-zero exit with error.
- **FR-17:** The snippet audit must evaluate consolidating `preamble-guard.md` and `preamble-guard-extended.md` into a single universal preamble snippet. Light content changes during consolidation are acceptable if they reduce the snippet count without losing any required behaviour. The consolidated snippet replaces both. This applies the principle: fewer snippets is better than maximum fidelity to the original template structure.

### Non-Functional

- **NFR-1:** The embed script change must not break the existing build pipeline. `bun run build:templates` must produce byte-identical output for any template that contains no directives.
- **NFR-2:** The snippet resolution logic must be readable in under 30 lines. No parser libraries — a line-by-line scan and file-read is sufficient.
- **NFR-3:** Snippet files are plain Markdown, editable without any tooling knowledge beyond a text editor.
- **NFR-4:** The directive syntax `<!-- include: relic snippet <name> -->` renders invisibly in GitHub Markdown previews — HTML comments are hidden by the renderer.

---

## User Stories

- As a Relic maintainer, I want to update the preamble guard wording in one file and have it propagate to all 6 templates on the next build, so I never touch 6 files for a one-line change.
- As a Relic maintainer, I want the HTML inline reader instructions to live in one place, so they stay consistent across all 5 commands that use them.

---

## Scope

### In Scope

- `templates/snippets/` directory and the snippet files from the audit (exact count determined by consolidation in FR-17).
- Directive syntax: `<!-- include: relic snippet <name> -->` — LLM-runtime invocation, not build-time substitution.
- Minimal modification of `scripts/embed-engine-templates.ts` — adds `SNIPPETS` registry bake only; no skill entries (see 011), no directive resolution logic.
- Modification of the relevant `templates/prompts/*.md` files to replace verbatim blocks with `<!-- include: relic snippet -->` directives.
- `relic snippet <name>` CLI command — LLM calls this at runtime; developers use it for inspection.
- Circular reference detection in `relic snippet` when resolving nested includes.
- `packages/engines/src/index.ts` — export `SNIPPETS` from `@relic/engines`.

### Out of Scope

- Skill files, skill write logic, `<!-- use: relic.<skill-name> -->` directive applications — handled by spec 011.
- `templates/preamble.md` updates (skill mandate) — handled by spec 011.
- `scripts/embed-templates.ts` (scaffold templates) — minimal repetition, not addressed here.
- Variable substitution in snippets (`{{PLACEHOLDER}}`-style tokens).
- Build-time directive resolution — directives travel with the baked template and are resolved by the LLM at runtime.

---

## Shared Artifacts

**Owns:**
- `shared/contracts/SnippetIncludeContract.md` — directive syntax for both `<!-- include: -->` and `<!-- use: -->` forms, resolution rules, error behaviour, and the canonical snippet registry. (Note: `<!-- use: -->` syntax defined here; its application to skill templates is implemented by spec 011.)

**Reads:**
- `shared/domains/TemplateDomain.md` (owned by 004) — governs how templates are embedded; the snippet system extends this domain's build-time contract.

---

## Intersection Check

| File / artifact | Spec 010 action | Conflict? |
|---|---|---|
| `scripts/embed-engine-templates.ts` | Modify — add `SNIPPETS` registry bake | Spec 004 does not list this file. No conflict. Spec 011 also touches this file (additive skill entries — coordinated). |
| `templates/prompts/*.md` | Modify — replace static blocks with `<!-- include: -->` directives | Not exclusively owned by another spec. Spec 011 also modifies these (skill directive replacements — additive, sequential). |
| `templates/snippets/` | Create — new directory | Entirely new path. No conflict. |
| `packages/core/src/commands/snippet.ts` | Create — `runSnippet` with cycle detection | New file. No conflict. |
| `packages/core/src/index.ts` | Modify — add `export { runSnippet }` | Listed in specs 002, 004, 005, 006, 007, 008, 009 (all implemented). Additive export only. |
| `packages/cli-node/src/bin.ts` | Modify — add `relic snippet <name>` command | Listed in specs 003–009 (all implemented). Additive new command. |
| `packages/engines/src/index.ts` | Modify — add `export { SNIPPETS }` | Not listed in any other spec. No conflict. |
| `packages/engines/src/generated/engine-templates.ts` | Auto-generated — gains `SNIPPETS` export | Not listed in any other spec. No conflict. |
| `shared/domains/TemplateDomain.md` | Read only | Owned by spec 004. No ownership claim. |

---

## Decisions

- **Runtime resolution, not build-time:** `<!-- include: relic snippet <name> -->` directives are NOT resolved by the embed script. They travel verbatim in the baked template. The LLM sees the directive and calls `relic snippet <name>` at runtime. Rejected: build-time substitution (bakes a single compiled version, loses composability; adds build complexity).
- **Directive syntax — two forms defined in SnippetIncludeContract.md:** `<!-- include: relic snippet <name> -->` (load snippet) and `<!-- use: relic.<skill-name> -->` (invoke skill). Both syntaxes are owned by this spec's contract. Applying `<!-- use: -->` directives to templates is implemented by spec 011.
- **Snippets support composition, not substitution:** Snippets may include other snippets, building complex context blocks from primitives. No `{{PLACEHOLDER}}` variable substitution.
- **Snippet consolidation is in scope:** Light content changes during extraction are acceptable where they reduce the total snippet count (FR-17).
- **`relic snippet <name>` CLI command:** Outputs named snippet content from the baked `SNIPPETS` registry. Registered in `packages/cli-node/src/bin.ts`.
- **Snippets not in ENGINE_TEMPLATES:** Accessed at runtime via `relic snippet`; not written to `.claude/commands/`.
- **Skills are a separate spec:** Skill file creation, Claude engine write logic, preamble mandate, and `<!-- use: -->` template applications are fully scoped to spec 011. This spec owns only the snippet track and the directive syntax definitions.
