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

| Skill directory | Procedure | Currently embedded in | After extraction |
|---|---|---|---|
| `search-context/SKILL.md` | Two-step artifact discovery (Step A targeted search → Step B full brain scan fallback) | specify, plan (verbatim) | Standalone skill; specify and plan replace embedded procedure with `<!-- use: relic.search-context -->` |
| `check-intersections/SKILL.md` | Load all `specs/*/artifacts.json`, compare `owns` and `touches_files` for conflicts | specify, clarify, plan, tasks (paraphrased) | Standalone skill; command templates use `<!-- use: relic.check-intersections -->` |

### Proactive Skills (ambient monitors)

| Skill directory | `description` frontmatter (auto-invoke trigger) | Action | Output |
|---|---|---|---|
| `smart-search/SKILL.md` | User asks about a domain, concept, system behaviour, or rule that relic tracks (e.g. "how does auth work?", "what's the session contract?") | Run `relic search <keywords>` → surface relevant artifact names, tldr, and path | Ask user if they want to read the full artifact(s) — do NOT run the full workflow |
| `suggest-workflow/SKILL.md` | Conversation reveals: (a) a bug/error in code owned by a spec, or (b) a feature/capability discussion warranting a new spec | Identify which workflow fits (`/relic.fix` or `/relic.specify`), explain why, give a one-line summary of what relic knows about the area | Ask user to confirm before proceeding — never activate without confirmation |

---

## Requirements

### Functional

- **FR-1:** A `templates/skills/` directory holds skill source directories. Each skill is a **directory** containing `SKILL.md` as its entrypoint plus any number of supporting files in any format — Markdown, shell scripts (`.sh`), Python (`.py`), JavaScript (`.js`), TypeScript (`.ts`), Bun scripts, or any other text-based format. This mirrors the `.claude/skills/<name>/` folder structure that Claude Code recognises natively and enables bundling of runnable helpers alongside the skill definition.
- **FR-2:** Skills are written to `.claude/skills/relic.<name>/SKILL.md` (one directory per skill) by both `relic init` and `relic add-engine`. This is the current best-practice location for Claude Code skills. Existing relic workflow commands remain in `.claude/commands/` — migration of commands to skills is out of scope for this spec. The write logic routes through `packages/engines/src/engines/claude/index.ts`.
- **FR-3:** Skills must be named to reflect their standalone utility (e.g., `relic.search-context`, `relic.check-intersections`) — not tied to a specific parent command.
- **FR-4:** Command templates that previously embedded a procedure inline must instead reference the skill by name using a `<!-- use: relic.<skill-name> -->` directive. This directive replaces both embedded procedure blocks and prose references ("Run `/relic.search-context` before proceeding."). The skill file is the single source of truth for that procedure.
- **FR-5:** Because skills appear in `.claude/skills/`, the LLM can invoke them at any time — when a user is debugging, reviewing, implementing, or doing anything where artifact knowledge is relevant — not only when they explicitly use a relic command.
- **FR-6:** Skills may use `<!-- include: relic snippet <name> -->` directives (to load shared static context blocks defined by spec 010) and `<!-- use: relic.<skill-name> -->` directives (to invoke other skills). Both are resolved by the LLM at runtime.
- **FR-7:** `templates/preamble.md` is updated to: (a) mandate `/relic.search-context` invocation via a `<!-- use: relic.search-context -->` directive, replacing the embedded search cascade; (b) document the complete directive system for the LLM — explaining that `<!-- include: relic snippet <name> -->` means "call `relic snippet <name>` and apply the result" and `<!-- use: relic.<skill-name> -->` means "invoke `/relic.<skill-name>` now."
- **FR-8:** `scripts/embed-engine-templates.ts` is extended to walk `templates/skills/` recursively. For each file found anywhere inside a skill directory (not just `SKILL.md` — any file, any extension), it stores the file content in the `SKILLS` export keyed by its relative path from `templates/skills/` (e.g. `search-context/SKILL.md`, `search-context/helper.sh`, `suggest-workflow/check.py`). `writeClaude()` iterates all SKILLS entries, derives the skill name from the first path segment, creates the `.claude/skills/relic.<name>/` directory, and writes each file at its relative path inside that directory — replicating the full source tree. This is an additive change on top of spec 010's SNIPPETS registry bake.
- **FR-9:** The `<!-- use: relic.<skill-name> -->` directive applied in command templates is the canonical replacement for all prose instructions like "Run `/relic.search-context` before proceeding." All such prose references in command templates must be replaced with this directive form. The directive is an HTML comment — invisible in rendered Markdown, recognised by the LLM as a workflow instruction.

- **FR-10:** A **proactive skill** fires without explicit user invocation. Claude Code reads the `description` frontmatter field of each `SKILL.md` and uses it to decide when to auto-invoke the skill. Proactive relic skills include a `description` field in their YAML frontmatter that describes the trigger condition. This is the native Claude Code auto-invocation mechanism — no external configuration file is required.
- **FR-11:** Proactive skills MUST NOT execute any relic workflow, run any CLI command, or write any file without explicit user confirmation in the current turn. The confirmation gate is mandatory: surface the opportunity, name the workflow, ask. The user's "yes" or equivalent triggers the workflow.
- **FR-12:** `templates/skills/smart-search/SKILL.md` — proactive skill. Frontmatter `description`: fires when the user's question touches a domain, concept, rule, or system behaviour that relic tracks. Runs `relic search <keywords>`, surfaces matching artifact names and tldr lines, asks the user if they want to read the full artifact(s). Does not invoke `/relic.specify`, `/relic.plan`, or any other workflow command.
- **FR-13:** `templates/skills/suggest-workflow/SKILL.md` — proactive skill. Frontmatter `description`: fires when conversation context reveals a bug in spec-owned code or a new feature being discussed. Offers `/relic.fix` or `/relic.specify` accordingly. Explains why relic is relevant and asks the user to confirm before proceeding.
- **FR-14:** Relic distinguishes between **relic-managed files** and **user-maintained files** within AI engine directories. Relic MAY write to directories and files it creates and owns: `.claude/skills/relic.*/`, `.claude/commands/relic.*.md`, `.claude/settings.json`, `.github/copilot-instructions.md`, `.codex/`. Relic MUST NOT write to files the user maintains: `.claude/CLAUDE.md`, `.claude/agents.md`, or any file in an AI engine directory that relic did not create. The boundary is ownership, not directory.
- **FR-15 (removed):** No longer applicable. Auto-invocation is handled natively by the `description` frontmatter in `SKILL.md`.
- **FR-16:** All files in `templates/prompts/` that currently contain `<!-- include: relic snippet search-knowledge -->` must be updated to `<!-- use: relic.search-context -->`. This applies to both the prompt templates (`specify.md`, `plan.md`, `ask.md`) and any other template file that references the snippet. The skill is the canonical search mechanism for Claude. No template file should inline the search procedure via snippet after this spec is implemented. Note: this migration applies within the existing `.claude/commands/` command files — full migration of workflow commands to `.claude/skills/` format is a separate future spec.

### Non-Functional

- **NFR-1:** After extraction, 4 new skill directories are created in `.claude/skills/` (2 procedural + 2 proactive). Existing `.claude/commands/relic.*.md` files are unchanged.
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

- `templates/skills/<name>/SKILL.md` — one directory per skill (4 total: 2 procedural + 2 proactive). Each `SKILL.md` has YAML frontmatter; proactive skills include a `description` field for Claude Code auto-invocation.
- Both `relic init` and `relic add-engine` write skills to `.claude/skills/relic.<name>/SKILL.md` via `packages/engines/src/engines/claude/index.ts`. Existing `.claude/commands/` entries are not modified.
- `scripts/embed-engine-templates.ts` — additive extension to walk `templates/skills/<name>/SKILL.md` and add skill entries to `ENGINE_TEMPLATES` (on top of spec 010's SNIPPETS bake).
- Command templates updated to replace prose skill references and embedded procedures with `<!-- use: relic.<skill-name> -->` directives.
- `templates/preamble.md` — replace embedded search cascade with `<!-- use: relic.search-context -->` and document the directive system (`<!-- include: -->` and `<!-- use: -->`).
- Skills may use both `<!-- include: relic snippet <name> -->` and `<!-- use: relic.<skill-name> -->` directives.
- **Snippet-to-skill migration:** all `<!-- include: relic snippet search-knowledge -->` directives in `templates/prompts/` replaced with `<!-- use: relic.search-context -->`. The `search-knowledge` snippet becomes a non-Claude fallback only.
- Relic writes only to files it created and owns — never to user-maintained files (`.claude/CLAUDE.md`, `.claude/agents.md`, etc.).

### Out of Scope

- Snippet files and the `relic snippet` CLI command — handled by spec 010.
- Skill support for Copilot or Codex engines — v1 is Claude only; engines package is wired for future extension.
- Build-time directive resolution — directives remain LLM-runtime instructions.
- Third-party skill extension — only first-party skills exist in `templates/skills/`.
- Fully automated workflow execution — proactive skills always ask first.
- Full migration of existing `.claude/commands/relic.*.md` workflow commands to `.claude/skills/` format — workflow commands stay as commands; this spec adds new skill directories only. The search snippet replacement within those command files (FR-16) is in scope.

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
| `templates/skills/<name>/SKILL.md` | Create — new directory structure (4 skill directories) | Entirely new path. No conflict. |
| `.claude/skills/` | Create — relic-managed skill directories written at init/add-engine time | Entirely new path. Not listed in any other spec. No conflict. |
| `packages/engines/src/engines/claude/index.ts` | Add skill write loop (creates directories, writes SKILL.md) | Not listed in any other spec. No conflict. |
| `templates/preamble.md` | Replace search cascade with `<!-- use: relic.search-context -->` + directive docs | Not listed in any other spec's `touches_files`. No conflict. |
| `packages/engines/src/generated/engine-templates.ts` | Auto-generated — gains skill entries | Spec 010 also touches this. **Coordinated** — skill entries are an additive section alongside SNIPPETS export. |
| `templates/preamble.md` | Add **Directive System** section and **Proactive Skills** section | Not listed in any other spec's `touches_files`. No conflict. Relic-owned file. |
| `shared/contracts/SkillExtractionContract.md` | Owns — ownership transferred from spec 010 | No conflict. |
| `shared/contracts/SnippetIncludeContract.md` | Read only | Owned by spec 010. No ownership claim. |
| `shared/domains/TemplateDomain.md` | Read only | Owned by spec 004. No ownership claim. |

---

## Decisions

- **Skills live in `.claude/skills/`, commands stay in `.claude/commands/`:** `.claude/skills/<name>/SKILL.md` is the current Claude Code best practice for reusable, bundleable procedures. Existing relic workflow commands remain as `.claude/commands/relic.*.md` — migration is out of scope. New skills are written only to `.claude/skills/`.
- **Skill directory = bundleable unit of any file type:** A skill folder can contain `SKILL.md` plus any supporting files in any format — shell scripts, Python, JavaScript, Bun scripts, data files, reference docs. The build system stores every file verbatim. The write system replicates the full directory tree into `.claude/skills/relic.<name>/`. Future skill iterations add helpers without touching the build or write logic.
- **Proactive invocation via `description` frontmatter:** Claude Code natively auto-invokes skills when the conversation matches the `description` field. No external configuration file or CLAUDE.md write required. This is the correct mechanism for `smart-search` and `suggest-workflow`.
- **Skill write via engines package:** `packages/engines/src/engines/claude/index.ts` owns the write logic. It iterates all SKILLS entries, groups by first path segment (the skill name), creates `.claude/skills/relic.<name>/` directories, and writes each file at its relative path — replicating the full source tree regardless of file type or depth. Future engines add a handler here; no changes to `init.ts` or `add-engine`.
- **Both `relic init` and `relic add-engine` write skills:** Both entry points produce a complete, usable skill set. No `relic add-skills` command.
- **Preamble mandate:** `templates/preamble.md` removes the embedded search cascade and replaces it with an authoritative mandate to invoke `/relic.search-context`. Documents both directive types for the LLM.
- **`<!-- use: relic.<skill-name> -->` is the canonical form:** All prose references to skills are replaced with this directive in command templates. Machine-readable, invisible in rendered Markdown.
- **Claude only in v1:** Skills are written to `.claude/skills/` only for Claude. Copilot and Codex engines return an empty skill set.
- **Prerequisite on spec 010:** Skill files use `<!-- include: relic snippet preamble-guard -->` for their opening preamble. Spec 010 must be implemented first.
- **Relic-managed vs user-maintained files:** Relic may write to directories and files it creates: `.claude/skills/relic.*/`, `.claude/commands/relic.*.md`, `.claude/settings.json`. It must never write to user-maintained files (`.claude/CLAUDE.md`, `.claude/agents.md`).
- **Confirmation gate is mandatory:** Proactive skills detect and surface — they do not act. The user must explicitly confirm before any relic workflow is activated.
- **Skill set is extensible:** Future specs may add skills by adding directories to `templates/skills/`. The build pipeline and write logic support arbitrary additions.
- **Skills are lazy, snippets are eager:** A snippet is inlined at load time — always in context. A skill is invoked on demand — its procedure runs only when needed. Procedural snippets with CLI commands should be promoted to skills for lighter prompts and richer logic.
- **`search-context` skill is the canonical search mechanism for Claude:** Prompt templates reference it via `<!-- use: relic.search-context -->`. The `search-knowledge` snippet remains as a non-Claude fallback only.

---

## Open Questions

- [x] **OQ-1:** Are there additional skill candidates beyond `search-context` and `check-intersections`? → **Resolved:** Yes — two proactive skills added: `smart-search.md` and `suggest-workflow.md`. Skill set is designed to be extensible; future specs may add more.
- [ ] **OQ-2:** Should 011 produce its own Phase 7 build verification step, or does it run the same `bun run build:templates` + relic init test from spec 010's plan?
- [ ] **OQ-3:** The proactive trigger conditions in `.claude/CLAUDE.md` are natural language. How specific should they be? Too broad → false positives (noisy). Too narrow → missed opportunities. Propose wording at plan time.
- [ ] **OQ-4:** `suggest-workflow.md` needs to detect which spec owns the code area mentioned by the user. Should it run `relic search <keywords>` + scan `artifacts.json` `touches_files`? Or is there a lighter heuristic? Decide at plan time.
- [ ] **OQ-5:** Should `search-knowledge.md` be removed from `templates/snippets/` entirely after migration, or kept as a documented non-Claude fallback? If kept, it should carry a comment marking it as deprecated for Claude. Decide at plan time.
