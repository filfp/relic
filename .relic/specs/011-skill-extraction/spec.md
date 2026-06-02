# Spec: Skill Extraction

**Spec ID:** 011-skill-extraction
**Created:** 2026-06-02
**Status:** draft

---

## Overview

Spec 010 introduced snippet injection — static text blocks extracted into reusable `<!-- include: relic snippet <name> -->` directives. That work left one problem unsolved: **procedural steps are trapped inside commands**. The artifact search cascade, for example, only fires when the user explicitly invokes `/relic.specify` or `/relic.plan`. If the LLM is working outside a relic command flow (debugging, implementing, answering a question), it has no access to those procedures.

This spec delivers **Track 2 — Skill extraction (proactive, standalone commands):** a `templates/skills/` directory of standalone procedure files written to `.claude/commands/` by `relic init`/`add-engine`. These skills can be invoked by the LLM **at any time** — not just inside a relic command flow — and command templates reference them by name via `<!-- use: relic.<skill-name> -->` directives instead of embedding the procedure inline.

The principle for this spec: **procedures → skills.**

**Prerequisite:** Spec 010-prompt-snippet-injection must be implemented first. Skills use `<!-- include: relic snippet <name> -->` directives for shared static context blocks.

---

## Delivery Track Classification

| Block | Current state | Track | Rationale |
|---|---|---|---|
| Artifact search cascade (Step A + Step B) | Embedded in specify, plan | **Skill** | 12-line procedure; useful any time the LLM needs to discover relevant artifacts, not just inside relic commands |
| Intersection check procedure | Embedded in specify, clarify, plan, tasks | **Skill** | Procedural; should fire whenever files are about to be modified, not just inside relic commands |

---

## Audit — Initial Skill Set

| Skill file | Procedure | Currently embedded in | After extraction |
|---|---|---|---|
| `search-context.md` | Two-step artifact discovery (Step A targeted search → Step B full brain scan fallback) | specify, plan (verbatim) | Standalone skill; specify and plan replace embedded procedure with `<!-- use: relic.search-context -->` |
| `check-intersections.md` | Load all `specs/*/artifacts.json`, compare `owns` and `touches_files` for conflicts | specify, clarify, plan, tasks (paraphrased) | Standalone skill; command templates use `<!-- use: relic.check-intersections -->` |

---

## Requirements

### Functional

- **FR-1:** A `templates/skills/` directory holds skill definition files. Each skill is a standalone procedure the LLM can invoke as a slash command, independent of any relic workflow command.
- **FR-2:** Skills are written to `.claude/commands/` by both `relic init` and `relic add-engine`, alongside the existing command files. They are first-class slash commands. The write logic routes through `packages/engines/src/engines/claude/index.ts` — the engines package layer — ensuring that extending to additional engines in future versions requires no changes to `init.ts` or `add-engine` logic directly.
- **FR-3:** Skills must be named to reflect their standalone utility (e.g., `relic.search-context`, `relic.check-intersections`) — not tied to a specific parent command.
- **FR-4:** Command templates that previously embedded a procedure inline must instead reference the skill by name using a `<!-- use: relic.<skill-name> -->` directive. This directive replaces both embedded procedure blocks and prose references ("Run `/relic.search-context` before proceeding."). The skill file is the single source of truth for that procedure.
- **FR-5:** Because skills appear in `.claude/commands/`, the LLM can invoke them at any time — when a user is debugging, reviewing, implementing, or doing anything where artifact knowledge is relevant — not only when they explicitly use a relic command.
- **FR-6:** Skills may use `<!-- include: relic snippet <name> -->` directives (to load shared static context blocks defined by spec 010) and `<!-- use: relic.<skill-name> -->` directives (to invoke other skills). Both are resolved by the LLM at runtime.
- **FR-7:** `templates/preamble.md` is updated to: (a) mandate `/relic.search-context` invocation via a `<!-- use: relic.search-context -->` directive, replacing the embedded search cascade; (b) document the directive system for the LLM — explaining that `<!-- include: relic snippet <name> -->` means "call `relic snippet <name>` and apply the result" and `<!-- use: relic.<skill-name> -->` means "invoke `/relic.<skill-name>` now."
- **FR-8:** `scripts/embed-engine-templates.ts` is extended to walk `templates/skills/*.md` and add those files to `ENGINE_TEMPLATES` with keys `skills/<name>.md`. `writeClaude()` detects skill keys by prefix and writes them to `.claude/commands/relic.<name>.md`. This is an additive change on top of spec 010's SNIPPETS registry bake.
- **FR-9:** The `<!-- use: relic.<skill-name> -->` directive applied in command templates is the canonical replacement for all prose instructions like "Run `/relic.search-context` before proceeding." All such prose references in command templates must be replaced with this directive form. The directive is an HTML comment — invisible in rendered Markdown, recognised by the LLM as a workflow instruction.

### Non-Functional

- **NFR-1:** After extraction, the total number of standalone `.claude/commands/` entries increases by exactly 2 (one per extracted skill). No existing command file is removed.
- **NFR-2:** Skill files are plain Markdown, editable without any tooling knowledge beyond a text editor.
- **NFR-3:** Both `relic init` and `relic add-engine` write skill files. No `relic add-skills` command — only first-party skills exist.

---

## User Stories

- As a Relic developer, I want to use `/relic.search-context` when I'm debugging a module — even though I never opened `/relic.fix` — so I can discover relevant contracts and domains without starting a relic workflow.
- As the LLM, I want to invoke `/relic.check-intersections` whenever I'm about to modify files in a relic project, regardless of which user prompt triggered the session, so I don't accidentally break owned artifacts.
- As a Relic maintainer, I want to update the intersection check procedure in one file and have it apply to all command templates automatically, so I never maintain the same logic in 4 places.

---

## Scope

### In Scope

- `templates/skills/` directory and the 2 skill files from the audit.
- Both `relic init` and `relic add-engine` write skills to `.claude/commands/` via `packages/engines/src/engines/claude/index.ts`.
- `scripts/embed-engine-templates.ts` — additive extension to walk `templates/skills/` and add skill entries to `ENGINE_TEMPLATES` (on top of spec 010's SNIPPETS bake).
- Command templates updated to replace prose skill references and embedded procedures with `<!-- use: relic.<skill-name> -->` directives.
- `templates/preamble.md` — replace embedded search cascade with `<!-- use: relic.search-context -->` and document both directive types for the LLM.
- Skills may use both `<!-- include: relic snippet <name> -->` and `<!-- use: relic.<skill-name> -->` directives.

### Out of Scope

- Snippet files and the `relic snippet` CLI command — handled by spec 010.
- Skill support for Copilot or Codex engines — v1 is Claude only; engines package is wired for future extension.
- Build-time directive resolution — directives remain LLM-runtime instructions.
- Third-party skill extension — only first-party skills exist in `templates/skills/`.

---

## Shared Artifacts

**Owns:**
- `shared/contracts/SkillExtractionContract.md` — skill definition rules, naming conventions, how skills are referenced from command templates, how they are written to AI engine directories, and the canonical skill registry. (Ownership transferred from spec 010 — see changelog.)

**Reads:**
- `shared/contracts/SnippetIncludeContract.md` (owned by 010) — directive syntax for `<!-- include: -->` and `<!-- use: -->`; skills use both forms.
- `shared/domains/TemplateDomain.md` (owned by 004) — governs how templates are embedded; the skill system extends this domain's build-time contract.

---

## Intersection Check

| File / artifact | Spec 011 action | Conflict? |
|---|---|---|
| `scripts/embed-engine-templates.ts` | Modify — add skill entries baking loop | Spec 010 also touches this (SNIPPETS bake). **Coordinated** — additive loop after existing SNIPPETS loop; applied after 010 is implemented. |
| `templates/prompts/*.md` | Modify — replace procedures with `<!-- use: -->` directives | Spec 010 also modifies these (snippet directives). **Coordinated** — additive, sequential; applied after 010's snippet replacements. |
| `templates/skills/` | Create — new directory | Entirely new path. No conflict. |
| `packages/engines/src/engines/claude/index.ts` | Add skill write loop (prefix detection) | Not listed in any other spec. No conflict. |
| `templates/preamble.md` | Replace search cascade with `<!-- use: relic.search-context -->` + directive docs | Not listed in any other spec's `touches_files`. No conflict. |
| `packages/engines/src/generated/engine-templates.ts` | Auto-generated — gains skill entries | Spec 010 also touches this. **Coordinated** — skill entries are an additive section alongside SNIPPETS export. |
| `shared/contracts/SkillExtractionContract.md` | Owns — ownership transferred from spec 010 | No conflict. |
| `shared/contracts/SnippetIncludeContract.md` | Read only | Owned by spec 010. No ownership claim. |
| `shared/domains/TemplateDomain.md` | Read only | Owned by spec 004. No ownership claim. |

---

## Decisions

- **Skill write via engines package:** `packages/engines/src/engines/claude/index.ts` owns the write logic, using prefix detection on ENGINE_TEMPLATES keys (`skills/<name>.md`). Future engines add a handler here; `init.ts` and `add-engine` remain unchanged.
- **Both `relic init` and `relic add-engine` write skills:** Both entry points must produce a complete, usable skill set. No `relic add-skills` command.
- **Preamble mandate:** `templates/preamble.md` removes the embedded search cascade and replaces it with an authoritative mandate to invoke `/relic.search-context`. The skill is the single source of truth for the cascade procedure.
- **`<!-- use: relic.<skill-name> -->` is the canonical form:** All prose references to skills are replaced with this directive in command templates. Machine-readable, invisible in rendered Markdown.
- **Claude only in v1:** Skills are written to `.claude/commands/` only. Copilot and Codex engines return an empty skill set.
- **Prerequisite on spec 010:** Skill files use `<!-- include: relic snippet preamble-guard -->` for their opening preamble. Spec 010 must be implemented first.

---

## Open Questions

- [ ] **OQ-1:** Are there additional skill candidates beyond `search-context` and `check-intersections`? Review all command templates at plan time for any remaining embedded procedures.
- [ ] **OQ-2:** Should 011 produce its own Phase 7 build verification step, or does it run the same `bun run build:templates` + relic init test from spec 010's plan?
