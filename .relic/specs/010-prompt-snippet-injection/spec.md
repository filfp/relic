# Spec: Prompt Modularization

**Spec ID:** 010-prompt-snippet-injection
**Created:** 2026-05-25
**Status:** draft

---

## Overview

The 12 prompt templates in `templates/prompts/` have two compounding problems. First, **static content is copy-pasted** — the same preamble guard, HTML rules, and inline reader instructions appear verbatim across 6–10 files. Second, **procedural steps are trapped inside commands** — the artifact search cascade, for example, only fires when the user explicitly invokes `/relic.specify` or `/relic.plan`. If the LLM is working outside a relic command flow (debugging, implementing, answering a question), it has no access to those procedures.

This spec delivers two complementary tracks:

**Track 1 — Snippet injection (LLM-runtime composition):** A `templates/snippets/` directory of named Markdown fragments. Templates reference snippets with `<!-- include: relic snippet <name> -->` directives. These directives are **not resolved at build time** — they travel verbatim in the baked template and the LLM resolves them at runtime by calling `relic snippet <name>`. Snippets may compose other snippets via nested directives, enabling reusable building blocks of any complexity.

**Track 2 — Skill extraction (proactive, standalone commands):** A `templates/skills/` directory of standalone procedure files written to `.claude/commands/` by `relic init`/`add-engine`. These skills can be invoked by the LLM **at any time** — not just inside a relic command flow — and command templates reference them by name instead of embedding the procedure inline.

The principle: **static text → snippets. Procedures → skills.**

---

## Delivery Track Classification

Every repeated block in the current templates falls into one of two categories:

| Block | Current state | → Track | Rationale |
|---|---|---|---|
| Preamble guard (2-line blockquote) | Verbatim in 6 templates | **Snippet** | Pure static text, no decision logic |
| Preamble guard extended (fix.md) | Verbatim in 1 template | **Snippet** | Same — slightly different static text |
| "Read `.relic/constitution.md`" instruction | Verbatim in 5 templates | **Snippet** | 1-line static instruction |
| Artifact search cascade (Step A + Step B) | Embedded in specify, plan | **Skill** | 12-line procedure; useful any time the LLM needs to discover relevant artifacts, not just inside relic commands |
| Intersection check procedure | Embedded in specify, clarify, plan, tasks | **Skill** | Procedural; should fire whenever files are about to be modified, not just inside relic commands |
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

## Audit — Initial Skill Set

| Skill file | Procedure | Currently embedded in | After extraction |
|---|---|---|---|
| `search-context.md` | Two-step artifact discovery (Step A targeted search → Step B full brain scan fallback) | specify, plan (verbatim) | Standalone skill; specify and plan reference it by name |
| `check-intersections.md` | Load all `specs/*/artifacts.json`, compare `owns` and `touches_files` for conflicts | specify, clarify, plan, tasks (paraphrased) | Standalone skill; command templates say "run `/relic.check-intersections`" |

---

## Requirements

### Functional — Track 1: Snippets

- FR-1: A `templates/snippets/` directory holds named Markdown fragment files. Each file is a self-contained block of prompt text (no front-matter, no directives — plain Markdown).
- FR-2: Any template in `templates/prompts/` or `templates/skills/` may reference a snippet using `<!-- include: relic snippet <name> -->`, where `<name>` is the snippet's registered identifier (filename without `.md`). The directive must appear on its own line. It is an LLM instruction, not a build-time substitution — the LLM reads it and calls `relic snippet <name>` to load the snippet content into its working context.
- FR-3: `scripts/embed-engine-templates.ts` bakes templates into `ENGINE_TEMPLATES` **as-is**. `<!-- include: relic snippet <name> -->` directives are preserved verbatim in the baked output and in the `.claude/commands/` files written to user projects. No directive resolution occurs at build time. The embed script change for snippet support is minimal: it only needs to bake the `SNIPPETS` registry (see FR-14) and add skills as standalone entries.
- FR-4: Snippets are **not** added as standalone entries in `ENGINE_TEMPLATES`. They are accessed at runtime via `relic snippet <name>`.
- FR-5: `relic snippet <name>` with an unknown name exits with a non-zero code and an error message. There is no build-time validation of directive names — errors surface when the LLM attempts to load the snippet.
- FR-6: After extraction, every `<!-- include: relic snippet <name> -->` in a template must produce the same effective content as the verbatim block it replaced when the LLM resolves it — no behavioural changes, only source consolidation.
- FR-7: Snippets may themselves contain `<!-- include: relic snippet <name> -->` directives, enabling composition: complex reusable blocks built from simpler primitives. No variable substitution (`{{PLACEHOLDER}}`-style tokens) is supported — composition via inclusion only. The LLM resolves nested directives depth-first. Circular references are detected: if snippet A includes snippet B which includes snippet A, `relic snippet` must report an error.

### Functional — Track 2: Skills

- FR-8: A `templates/skills/` directory holds skill definition files. Each skill is a standalone procedure the LLM can invoke as a slash command, independent of any relic workflow command.
- FR-9: Skills are written to `.claude/commands/` by both `relic init` and `relic add-engine`, alongside the existing command files. They are first-class slash commands. The write logic routes through `packages/engines/src/engines/claude/index.ts` — the engines package layer — ensuring that extending to additional engines in future versions requires no changes to `init.ts` or `add-engine` logic directly.
- FR-10: Skills must be named to reflect their standalone utility (e.g., `relic.search-context`, `relic.check-intersections`) — not tied to a specific parent command.
- FR-11: Command templates that previously embedded a procedure inline must instead reference the skill by name: a one-line instruction (`Run \`/relic.search-context\` before proceeding.`) replaces the embedded procedure. The skill file is the single source of truth for that procedure.
- FR-12: Because skills appear in `.claude/commands/`, the LLM can invoke them at any time — when a user is debugging, reviewing, implementing, or doing anything where artifact knowledge is relevant — not only when they explicitly use a relic command.
- FR-13: Skills may use both `<!-- include: relic snippet <name> -->` directives (to load shared context blocks) and `<!-- use: relic.<skill-name> -->` directives (to invoke other skills). Both are resolved by the LLM at runtime.
- FR-14: A `relic snippet <name>` CLI command outputs the content of a named snippet to stdout. The LLM calls this during template execution to load snippet content; developers may also call it directly to inspect snippets. Snippets are baked into the CLI binary (as a `SNIPPETS` map by `scripts/embed-engine-templates.ts`) — the command reads from that registry, not from loose files on disk. Unknown name → non-zero exit with error.
- FR-15: `templates/preamble.md` is updated to: (a) mandate `/relic.search-context` invocation via a `<!-- use: relic.search-context -->` directive replacing the embedded search cascade, and (b) document the directive system — explaining to the LLM that `<!-- include: relic snippet <name> -->` means "call `relic snippet <name>` and apply the result" and `<!-- use: relic.<skill-name> -->` means "invoke `/relic.<skill-name>` now."
- FR-16: A `<!-- use: relic.<skill-name> -->` directive in any template or skill file tells the LLM to invoke the slash command `/relic.<skill-name>` at that point in the workflow. This is the machine-readable, Markdown-invisible equivalent of prose instructions like "Run `/relic.search-context` before proceeding." Command templates that previously embedded inline procedures or had prose skill references must be updated to use this directive form.
- FR-17: The snippet audit must evaluate consolidating `preamble-guard.md` and `preamble-guard-extended.md` into a single universal preamble snippet. Light content changes during consolidation are acceptable if they reduce the snippet count without losing any required behaviour. The consolidated snippet replaces both. This applies the principle: fewer snippets/skills is better than maximum fidelity to the original template structure.

### Non-Functional

- NFR-1: The embed script change must not break the existing build pipeline. `bun run build:templates` must produce byte-identical output for any template that contains no directives.
- NFR-2: The snippet resolution logic must be readable in under 30 lines. No parser libraries — a line-by-line scan and file-read is sufficient.
- NFR-3: Both snippets and skill files are plain Markdown, editable without any tooling knowledge beyond a text editor.
- NFR-4: The directive syntax renders invisibly in GitHub Markdown previews — HTML comments are hidden by the renderer.
- NFR-5: After extraction, the total number of standalone `.claude/commands/` entries increases by exactly 2 (one per extracted skill). No existing command file is removed.

---

## User Stories

- As a Relic maintainer, I want to update the preamble guard wording in one file and have it propagate to all 6 templates on the next build, so I never touch 6 files for a one-line change.
- As a Relic maintainer, I want the HTML inline reader instructions to live in one place, so they stay consistent across all 5 commands that use them.
- As a Relic developer, I want to use `/relic.search-context` when I'm debugging a module — even though I never opened `/relic.fix` — so I can discover relevant contracts and domains without starting a relic workflow.
- As the LLM, I want to invoke `/relic.check-intersections` whenever I'm about to modify files in a relic project, regardless of which user prompt triggered the session, so I don't accidentally break owned artifacts.
- As the build system, I want a missing snippet or skill reference to fail the build loudly, so template rot is caught at build time, not at LLM runtime.

---

## Scope

### In Scope

**Track 1 (Snippets):**
- `templates/snippets/` directory and the snippet files from the audit (exact count determined by consolidation in FR-17).
- Directive syntax: `<!-- include: relic snippet <name> -->` — LLM-runtime invocation, not build-time substitution.
- Minimal modification of `scripts/embed-engine-templates.ts` — adds `SNIPPETS` registry bake and skill standalone entries; no directive resolution logic.
- Modification of the relevant `templates/prompts/*.md` files to replace verbatim blocks with directives.
- `relic snippet <name>` CLI command — LLM calls this at runtime; developers use it for inspection.
- Circular reference detection in `relic snippet` when resolving nested includes.

**Track 2 (Skills):**
- `templates/skills/` directory and the 2 skill files from the audit.
- Both `relic init` and `relic add-engine` write skills to `.claude/commands/` via `packages/engines/src/engines/claude/index.ts`.
- Command templates updated to replace prose skill references and inline procedures with `<!-- use: relic.<skill-name> -->` directives.
- Skills may use both `<!-- include: relic snippet <name> -->` and `<!-- use: relic.<skill-name> -->` directives.

**Preamble update:**
- `templates/preamble.md` updated to replace the embedded search cascade with `<!-- use: relic.search-context -->` and to document the directive system for the LLM.

### Out of Scope

- `scripts/embed-templates.ts` (scaffold templates) — minimal repetition, not addressed here.
- Variable substitution in snippets (`{{PLACEHOLDER}}`-style tokens) — the only supported composition mechanism is `<!-- include: relic snippet <name> -->` nesting.
- Skill support for Copilot or Codex engines (v1 is Claude only; engines package is wired for future extension).
- Build-time directive resolution — directives travel with the baked template and are resolved by the LLM at runtime. A future spec may add optional pre-resolution for engines that can't execute CLI calls.

---

## Shared Artifacts

**Owns:**
- `shared/contracts/SnippetIncludeContract.md` — directive syntax, resolution rules, error behaviour, and the canonical snippet registry.
- `shared/contracts/SkillExtractionContract.md` — skill definition rules, naming conventions, how skills are referenced from command templates, and the canonical skill registry.

**Reads:**
- `shared/domains/TemplateDomain.md` — governs how templates are embedded; the snippet and skill systems extend this domain's build-time contract.

---

## Intersection Check

| File / artifact | Spec 010 action | Conflict? |
|---|---|---|
| `scripts/embed-engine-templates.ts` | Modify — add directive resolution | Spec 004 does not list this file. No conflict. |
| `templates/prompts/*.md` | Modify — replace blocks with directives, reference skills | Not listed in any other spec. No conflict. |
| `templates/snippets/` | Create — new directory | Entirely new path. No conflict. |
| `templates/skills/` | Create — new directory | Entirely new path. No conflict. |
| `packages/core/src/commands/init.ts` | Modify — write skill files on init | Listed in spec 004's `touches_files`. **Coordinated** — additive skill-write step only; no existing init logic touched. |
| `packages/cli-node/src/bin.ts` | Modify — add `relic snippet` command | Listed in spec 004's `touches_files`. **Coordinated** — additive new command; no existing commands changed. |
| `packages/engines/src/engines/claude/index.ts` | Modify — add skill file write logic | Not listed in any other spec. No conflict. |
| `templates/preamble.md` | Modify — replace embedded search guidance with skill mandate | Modified by spec 005 (already implemented). Additive direction change, no ownership conflict. |
| `shared/domains/TemplateDomain.md` | Read only | Owned by spec 004. No ownership claim. |

---

## Open Questions

- [x] ~~Snippet path resolution (snippets-relative vs repo-relative)~~ → **Decided: named registry reference (`relic snippets <name>`), not a file path**
- [x] ~~Nested includes in v1?~~ → **Decided: yes, depth-first with cycle detection**
- [x] ~~Two preamble-guard files vs one parameterised?~~ → **Decided: two files**
- [x] ~~`init.ts` owned by spec 004 — options for skill write~~ → **Decided: both `relic init` AND `relic add-engine` write skills. No `relic add-skills` command — only first-party skills exist. `init.ts` modification coordinated with spec 004 (additive only).**
- [x] ~~Skills for Copilot/Codex vs Claude only?~~ → **Decided: Claude only in v1. Write logic routes through `packages/engines/src/engines/claude/index.ts` for future extensibility. Other engines return empty skill set.**
- [x] ~~`search-context.md` skill vs updating `preamble.md`~~ → **Decided: both. `templates/preamble.md` is updated to mandate `/relic.search-context` invocation — the skill IS the enforcement mechanism. Every relic project's preamble will tell the LLM to use the skill. The embedded search cascade is removed from the preamble.**

---

## Decisions

- **Runtime resolution, not build-time:** `<!-- include: relic snippet <name> -->` directives are NOT resolved by the embed script. They travel verbatim in the baked template. The LLM sees the directive and calls `relic snippet <name>` at runtime. Rejected: build-time substitution (bakes a single compiled version, loses composability; adds build complexity). The runtime approach means templates are self-describing: the LLM reads the directive as an instruction, not as a pre-resolved block.
- **Directive syntax — two forms:**
  - `<!-- include: relic snippet <name> -->` — load a snippet: the LLM calls `relic snippet <name>` and applies the content as context
  - `<!-- use: relic.<skill-name> -->` — invoke a skill: the LLM invokes `/relic.<skill-name>` at that point in the workflow
- **Snippets support composition, not substitution:** Snippets may include other snippets (`<!-- include: relic snippet <name> -->`), building complex context blocks from primitives. No `{{PLACEHOLDER}}` variable substitution is supported — that is out of scope.
- **Snippet consolidation is in scope:** Light content changes during extraction are acceptable where they reduce the total snippet count. The preamble audit must evaluate consolidating `preamble-guard.md` + `preamble-guard-extended.md` into one universal snippet.
- **`relic snippet <name>` CLI command:** Outputs named snippet content from the baked `SNIPPETS` registry. The LLM calls it at runtime; developers use it for inspection. Registered in `packages/cli-node/src/bin.ts`.
- **Skills on both `relic init` and `relic add-engine`:** Both entry points write skill files. No `relic add-skills` command — only first-party skills, no third-party extension.
- **Skill write via engines package:** `packages/engines/src/engines/claude/index.ts` owns the write logic. Future engines add a handler here; `init.ts` and `add-engine` remain unchanged.
- **Preamble mandate:** `templates/preamble.md` removes the embedded search cascade and replaces it with an authoritative mandate to invoke `/relic.search-context`. The skill is the single source of truth for the cascade procedure.
- **Skill storage:** `templates/skills/` flat directory, processed by the same embed pipeline.
- **Snippets not in ENGINE_TEMPLATES:** Resolved inline; engines receive fully composed templates.
- **Skills ARE in ENGINE_TEMPLATES:** Written as standalone `.claude/commands/relic.*.md` entries.
- **Principle:** Static text → snippets. Procedures → skills.
