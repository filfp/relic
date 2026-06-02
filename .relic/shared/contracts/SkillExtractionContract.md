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

| Skill file | Slash command | Procedure | Was embedded in |
|---|---|---|---|
| `search-context.md` | `/relic.search-context` | Two-step artifact discovery (targeted → full scan fallback) | specify, plan |
| `check-intersections.md` | `/relic.check-intersections` | Load all `artifacts.json`, compare `owns` + `touches_files` | specify, clarify, plan, tasks |

## What Skills Are NOT

- Skills are not snippets — they appear as standalone ENGINE_TEMPLATES entries, not inlined.
- Skills are not full workflow commands — they do one focused thing and return.
- Skills are not CLI commands — they are LLM instructions, not TypeScript code.

## Owned by

011-skill-extraction
