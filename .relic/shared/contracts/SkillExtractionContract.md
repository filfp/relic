# SkillExtractionContract

**Type:** contract
**Inferred from:** spec 010-prompt-snippet-injection (clarify session 2026-05-25); ownership transferred to spec 011-skill-extraction (clarify 2026-06-02)
**Confidence:** high

## Description

The contract governing which prompt template steps become standalone skills, how skill files are structured, how they are referenced from command templates, and how they are written to AI engine directories at init time.

## The Principle

**Static text → snippets. Procedures → skills.**

A prompt step is a **skill** when:
- It contains decision logic (if/else, multiple steps, fallback behaviour)
- It could be useful to the LLM independent of any specific relic command
- The LLM should be able to invoke it proactively (e.g., when working outside a relic workflow)
- Two or more command templates embed the same procedure

A prompt step is a **snippet** when:
- It is static text with no decision logic
- It only makes sense as part of a larger command
- It is purely decorative or instructional (no LLM action required)

## Skill Archetypes

Skills come in two archetypes with different invocation patterns:

**Procedural skills** — invoked explicitly, either by the user or by the LLM at a specific point in a command workflow (via `<!-- use: -->` directive). They execute a focused relic procedure and return. Examples: `search-context`, `check-intersections`.

**Proactive skills** — invoked by the LLM autonomously based on conversation context, without user command. They detect a trigger condition, surface the opportunity, and ask the user to confirm before taking any action. They MUST NOT execute relic workflows without explicit user confirmation. Examples: `smart-search`, `suggest-workflow`.

## Proactive Skill Requirements

A proactive skill file MUST contain:
- A **When to invoke** section describing the trigger conditions in natural language
- A **Confirmation gate** section — the user must say yes before any workflow fires
- An explicit **Do NOT** list: do not run workflows, write files, or execute commands without confirmation

Proactive skill trigger conditions are also written to the engine's ambient instruction file (`.claude/CLAUDE.md` for Claude), bounded by `<!-- relic: proactive-skills -->` markers, by both `relic init` and `relic add-engine`. This block is idempotent — regenerated, not appended, if the marker exists.

## Skill File Structure

Skills live in `templates/skills/<skill-name>.md`. Each file:
- Is a complete, standalone Markdown document (can be read and followed without any parent command context)
- Has a clear title (`# /relic.<skill-name>`)
- Describes exactly what to do, with explicit completion criteria
- May use `<!-- include: relic snippets <name> -->` directives for shared static blocks

## Naming Convention

Skill names follow `relic.<verb>-<noun>` format:
- `relic.search-context` — search for relevant artifacts in the knowledge base
- `relic.check-intersections` — check for ownership conflicts across specs

Names must reflect the skill's standalone utility, not its role in a parent command. Do NOT name skills `relic.specify-step2` or `relic.plan-search`.

## How Command Templates Reference Skills

Instead of embedding a procedure inline, command templates use the `<!-- use: -->` directive:

```markdown
<!-- use: relic.search-context -->
```

or:

```markdown
<!-- use: relic.check-intersections -->
```

This is a machine-readable HTML comment — invisible in rendered Markdown, recognised by the LLM as an instruction to invoke the skill at that point in the workflow. The full procedure lives in the skill file. The `<!-- use: -->` directive is the canonical form; prose references ("Run `/relic.search-context`") are replaced by this form.

## Build-Time Behaviour

- Skills in `templates/skills/` are processed by `scripts/embed-engine-templates.ts` alongside `templates/prompts/` templates.
- Skills ARE added to `ENGINE_TEMPLATES` as standalone entries (unlike snippets which are inlined).
- Both `relic init` and `relic add-engine` write skill files to `.claude/commands/` as first-class slash commands.
- The write logic lives in `packages/engines/src/engines/claude/index.ts` — routed through the engines package so future engines can add skill support without modifying `init.ts` or `add-engine` logic.
- Skill files appear in the same directory as relic command files — they are sibling commands, not children.

## Engine Coverage (v1)

| Engine | Skill output | Mechanism |
|---|---|---|
| Claude | `.claude/commands/relic.<skill-name>.md` | Slash command, written by both `relic init` and `relic add-engine` via `engines/claude` |
| Copilot | Not in v1 | Requires different invocation model — engines package extension point reserved |
| Codex | Not in v1 | Requires different invocation model — engines package extension point reserved |

## Canonical Skill Registry

### Procedural Skills

| Skill file | Slash command | Procedure | Was embedded in |
|---|---|---|---|
| `search-context.md` | `/relic.search-context` | Two-step artifact discovery (targeted → full scan fallback) | specify, plan |
| `check-intersections.md` | `/relic.check-intersections` | Load all `artifacts.json`, compare `owns` + `touches_files` | specify, clarify, plan, tasks |

### Proactive Skills

| Skill file | Slash command | Trigger condition | Fires when |
|---|---|---|---|
| `smart-search.md` | `/relic.smart-search` | User asks about a domain, concept, rule, or system behaviour relic tracks | LLM detects question about a topic in the relic knowledge base |
| `suggest-workflow.md` | `/relic.suggest-workflow` | Conversation reveals a bug in spec-owned code or a new feature discussion | LLM detects fix or specify opportunity |

## Snippet vs Skill — The Loading Distinction

| | Snippet | Skill |
|---|---|---|
| Timing | **Eager** — text inlined at prompt load time, always present in context | **Lazy** — invoked on demand; procedure runs only when needed |
| Complexity | Static text only — no CLI commands, no branching | Arbitrary — CLI commands, conditional logic, multi-step procedures |
| Context cost | Always paid, even when unused | Zero until the LLM decides to invoke |
| Reference form | `<!-- include: relic snippet <name> -->` | `<!-- use: relic.<skill-name> -->` |
| Best for | Short static preambles, guards, read-only instructions | Procedural steps that involve running commands or making decisions |

**Migration rule:** Any snippet that contains CLI commands (`relic search`, `relic context`, etc.) or decision logic should be promoted to a skill. The skill is richer and the prompt is lighter.

Specifically: `search-knowledge` snippet → superseded by `search-context` skill for Claude. All `<!-- include: relic snippet search-knowledge -->` directives in prompt templates must be replaced with `<!-- use: relic.search-context -->`.

## What Skills Are NOT

- Skills are not snippets — they appear as standalone ENGINE_TEMPLATES entries, not inlined at load time.
- Skills are not full workflow commands — they do one focused thing and return.
- Skills are not CLI commands — they are LLM instructions, not TypeScript code.

## Owned by

011-skill-extraction
