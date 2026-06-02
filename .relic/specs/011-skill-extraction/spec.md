# Spec: Skill Extraction

**Spec ID:** 011-skill-extraction
**Created:** 2026-06-02
**Status:** draft

---

## Overview

Spec 010 introduced snippet injection — static text blocks extracted into reusable `<!-- include: relic snippet <name> -->` directives. That work left one problem unsolved: **procedural steps are trapped inside commands**. The artifact search cascade, for example, only fires when the user explicitly invokes `/relic.specify` or `/relic.plan`. If the LLM is working outside a relic command flow (debugging, implementing, answering a question), it has no access to those procedures.

This spec delivers **Track 2 — Skill extraction and proactive workflow integration:** a `templates/skills/` directory of standalone procedure files written to `.claude/commands/` by `relic init`/`add-engine`, and a mechanism for the LLM to invoke these skills **automatically** when relic is relevant — without the user typing a command.

The principle for this spec: **procedures → skills. Relic integrates into the flow, not just the commands.**

Skills come in two archetypes:

**Procedural skills** — extracted from command templates. They execute a focused relic procedure (artifact search, intersection check) and are referenced from command templates via `<!-- use: relic.<skill-name> -->`. Useful both within a relic workflow and when invoked directly by the user.

**Proactive skills** — ambient monitors. They fire silently based on conversation context, detect when a relic workflow is relevant, and ask the user to activate it. They do NOT execute relic workflows without explicit user confirmation.

**Snippets vs skills — the loading distinction:**

The `search-knowledge` snippet (spec 010) inlines the search procedure text **eagerly** — every time a prompt is loaded, the full procedure block is present in the LLM's context whether or not a search is needed. The `search-context` skill is **lazy** — the LLM invokes it only when a search is needed, and the procedure lives in the skill file rather than in every prompt. This makes prompts lighter and the search procedure richer: a skill can run CLI commands, branch on results, and carry arbitrarily complex logic without bloating every command template.

**Migration rule:** All prompt templates currently using `<!-- include: relic snippet search-knowledge -->` must be updated to `<!-- use: relic.search-context -->`. The `search-knowledge` snippet in `templates/snippets/` is superseded for Claude by the skill. The snippet may be retained as a non-Claude fallback only.

**Prerequisite:** Spec 010-prompt-snippet-injection must be implemented first. Skills use `<!-- include: relic snippet <name> -->` directives for shared static context blocks.

---

## Delivery Track Classification

| Block | Current state | Track | Rationale |
|---|---|---|---|
| Artifact search cascade (Step A + Step B) | Embedded in specify, plan | **Procedural skill** | 12-line procedure; useful any time the LLM needs to discover relevant artifacts, not just inside relic commands |
| Intersection check procedure | Embedded in specify, clarify, plan, tasks | **Procedural skill** | Procedural; should fire whenever files are about to be modified, not just inside relic commands |
| Relic knowledge search | Not implemented | **Proactive skill** | LLM should surface relic artifacts when a user question touches a domain relic tracks, even outside any relic command |
| Workflow opportunity detection | Not implemented | **Proactive skill** | LLM should detect when a bug/feature in conversation could trigger `/relic.fix` or `/relic.specify`, and prompt the user |

---

## Audit — Skill Set

### Procedural Skills (extracted from command templates)

| Skill file | Procedure | Currently embedded in | After extraction |
|---|---|---|---|
| `search-context.md` | Two-step artifact discovery (Step A targeted search → Step B full brain scan fallback) | specify, plan (verbatim) | Standalone skill; specify and plan replace embedded procedure with `<!-- use: relic.search-context -->` |
| `check-intersections.md` | Load all `specs/*/artifacts.json`, compare `owns` and `touches_files` for conflicts | specify, clarify, plan, tasks (paraphrased) | Standalone skill; command templates use `<!-- use: relic.check-intersections -->` |

### Proactive Skills (ambient monitors)

| Skill file | Trigger condition | Action | Output |
|---|---|---|---|
| `smart-search.md` | User asks a question about a domain, concept, system behaviour, or rule that relic tracks (e.g. "how does auth work?", "what's the session contract?") | Run `relic search <keywords>` → surface relevant artifact names, tldr, and path | Ask user if they want to read the full artifact(s) — do NOT run the full workflow |
| `suggest-workflow.md` | Conversation context reveals: (a) a bug/error in code owned by a spec, or (b) a feature/capability discussion that would warrant a new spec | Identify which workflow fits (`/relic.fix` or `/relic.specify`), explain why, give a one-line summary of what relic knows about the area | Ask user to confirm before proceeding — never activate without confirmation |

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

- **FR-10:** A **proactive skill** fires without explicit user invocation. The LLM invokes it autonomously when it detects a trigger condition in the conversation. The trigger conditions are described in each proactive skill file's **When to invoke** section and mirrored in a relic-generated engine instruction file.
- **FR-11:** Proactive skills MUST NOT execute any relic workflow, run any CLI command, or write any file without explicit user confirmation in the current turn. The confirmation gate is mandatory: surface the opportunity, name the workflow, ask. The user's "yes" or equivalent triggers the workflow.
- **FR-12:** `templates/skills/smart-search.md` — proactive skill that fires when the user's question touches a domain, contract, rule, or concept relic tracks. Runs `relic search <keywords>`, surfaces matching artifact names and tldr lines, asks the user if they want to read the full artifact(s). Does not invoke `/relic.specify`, `/relic.plan`, or any other workflow command.
- **FR-13:** `templates/skills/suggest-workflow.md` — proactive skill that fires when conversation context suggests a relic workflow would help: (a) bug/error in code area owned by a spec → offer `/relic.fix`; (b) feature/capability being discussed that has no spec → offer `/relic.specify`. The skill identifies the relevant workflow and the owning/candidate spec, explains why relic is relevant, and asks the user to confirm before proceeding.
- **FR-14:** For proactive skills to fire automatically, relic writes a trigger-condition block to the engine's ambient instruction file. For Claude: this is appended to `.claude/CLAUDE.md` (creating it if absent) by both `relic init` and `relic add-engine`. The block describes the trigger conditions for each proactive skill in natural language, and instructs Claude to invoke the skill silently when a condition is met.
- **FR-15:** The trigger-condition block written to `.claude/CLAUDE.md` is managed by relic — identified by an `<!-- relic: proactive-skills -->` marker. `relic add-engine` regenerates this block if the marker is found, rather than appending a duplicate.
- **FR-16:** All prompt templates in `templates/prompts/` that currently contain `<!-- include: relic snippet search-knowledge -->` must be updated to `<!-- use: relic.search-context -->`. The skill is the canonical search mechanism for Claude. No prompt template should inline the search procedure text via snippet after this spec is implemented.

### Non-Functional

- **NFR-1:** After extraction, the total number of standalone `.claude/commands/` entries increases by exactly 4 (2 procedural + 2 proactive skills). No existing command file is removed.
- **NFR-2:** Skill files are plain Markdown, editable without any tooling knowledge beyond a text editor.
- **NFR-3:** Both `relic init` and `relic add-engine` write skill files. No `relic add-skills` command — only first-party skills exist.
- **NFR-4:** Proactive skills never block the user's primary intent. If the LLM chooses not to fire a proactive skill (ambiguous context, user clearly not asking about relic), it should proceed silently. Proactive skills are advisory, not mandatory.

---

## User Stories

- As a Relic developer, I want to use `/relic.search-context` when I'm debugging a module — even though I never opened `/relic.fix` — so I can discover relevant contracts and domains without starting a relic workflow.
- As the LLM, I want to invoke `/relic.check-intersections` whenever I'm about to modify files in a relic project, regardless of which user prompt triggered the session, so I don't accidentally break owned artifacts.
- As a Relic maintainer, I want to update the intersection check procedure in one file and have it apply to all command templates automatically, so I never maintain the same logic in 4 places.
- As a developer, when I ask "how does the auth session work?", I want the LLM to automatically surface relevant relic artifacts without me having to know that relic has that information.
- As a developer, when I paste a stack trace into the chat, I want the LLM to notice that the code area is owned by a relic spec and offer to open `/relic.fix` — without me having to remember to type it.
- As a developer, when I describe a new feature I want to build, I want the LLM to offer to create a spec for it via `/relic.specify`, so relic stays connected to what I'm actually working on.

---

## Scope

### In Scope

- `templates/skills/` directory and the 4 skill files from the audit (2 procedural + 2 proactive).
- Both `relic init` and `relic add-engine` write skills to `.claude/commands/` via `packages/engines/src/engines/claude/index.ts`.
- `scripts/embed-engine-templates.ts` — additive extension to walk `templates/skills/` and add skill entries to `ENGINE_TEMPLATES` (on top of spec 010's SNIPPETS bake).
- Command templates updated to replace prose skill references and embedded procedures with `<!-- use: relic.<skill-name> -->` directives.
- `templates/preamble.md` — replace embedded search cascade with `<!-- use: relic.search-context -->` and document both directive types for the LLM.
- Skills may use both `<!-- include: relic snippet <name> -->` and `<!-- use: relic.<skill-name> -->` directives.
- `.claude/CLAUDE.md` — relic writes (or appends) a proactive-skills trigger block with natural-language conditions for each proactive skill, bounded by `<!-- relic: proactive-skills -->` markers.
- **Snippet-to-skill migration:** all `<!-- include: relic snippet search-knowledge -->` directives in `templates/prompts/` replaced with `<!-- use: relic.search-context -->`. The `search-knowledge` snippet becomes a non-Claude fallback only.

### Out of Scope

- Snippet files and the `relic snippet` CLI command — handled by spec 010.
- Skill support for Copilot or Codex engines — v1 is Claude only; engines package is wired for future extension.
- Build-time directive resolution — directives remain LLM-runtime instructions.
- Third-party skill extension — only first-party skills exist in `templates/skills/`.
- Fully automated workflow execution — proactive skills always ask first.

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
| `.claude/CLAUDE.md` | Write proactive-skills trigger block (create if absent, replace if marker exists) | Not listed in any other spec's `touches_files`. No conflict. This is in the user's project, not the relic repo — convention, not a compile-time artifact. |
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
- **Proactive skills require a CLAUDE.md trigger block:** Skill files alone don't make the LLM invoke them proactively — Claude needs to be told when to do so. Relic writes a bounded block to `.claude/CLAUDE.md` describing the trigger conditions for each proactive skill. This block is idempotent (marker-bounded) so repeated `add-engine` runs don't duplicate it.
- **Confirmation gate is mandatory:** Proactive skills detect and surface — they do not act. The user must explicitly confirm before any relic workflow is activated. This is enforced in each proactive skill file's completion criteria.
- **Skill set is extensible:** The two proactive skills delivered in this spec are the first — not the last. Future specs may add skills to `templates/skills/` following the same pattern. The build pipeline and write logic are designed for arbitrary skill addition.
- **Skills are lazy, snippets are eager:** A snippet is inlined at load time — its text is always present in the prompt context. A skill is invoked on demand — its procedure runs only when the LLM decides a search (or check) is needed. This is why procedural snippets (especially those with CLI commands) should be promoted to skills: they make prompts lighter and allow richer, branching logic that would bloat a snippet.
- **`search-context` skill is the canonical search mechanism for Claude:** Prompt templates reference the skill via `<!-- use: relic.search-context -->`. The `search-knowledge` snippet remains in `templates/snippets/` as a non-Claude fallback but is not referenced from any Claude prompt template after this spec.

---

## Open Questions

- [x] **OQ-1:** Are there additional skill candidates beyond `search-context` and `check-intersections`? → **Resolved:** Yes — two proactive skills added: `smart-search.md` and `suggest-workflow.md`. Skill set is designed to be extensible; future specs may add more.
- [ ] **OQ-2:** Should 011 produce its own Phase 7 build verification step, or does it run the same `bun run build:templates` + relic init test from spec 010's plan?
- [ ] **OQ-3:** The proactive trigger conditions in `.claude/CLAUDE.md` are natural language. How specific should they be? Too broad → false positives (noisy). Too narrow → missed opportunities. Propose wording at plan time.
- [ ] **OQ-4:** `suggest-workflow.md` needs to detect which spec owns the code area mentioned by the user. Should it run `relic search <keywords>` + scan `artifacts.json` `touches_files`? Or is there a lighter heuristic? Decide at plan time.
- [ ] **OQ-5:** Should `search-knowledge.md` be removed from `templates/snippets/` entirely after migration, or kept as a documented non-Claude fallback? If kept, it should carry a comment marking it as deprecated for Claude. Decide at plan time.
