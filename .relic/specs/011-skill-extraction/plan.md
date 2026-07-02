# Plan: 011-skill-extraction

## Architecture Overview

Skills live in `templates/skills/<name>/SKILL.md` (one directory per skill) and flow through the build pipeline:

```
templates/skills/<name>/SKILL.md
    ↓ scripts/embed-engine-templates.ts (new SKILLS export)
    ↓ packages/engines/src/generated/engine-templates.ts
    ↓ packages/engines/src/engines/claude/index.ts (skill directory write loop)
    ↓ .claude/skills/relic.<name>/SKILL.md  (native Claude Code skill directories)
```

Proactive skills carry a `description` frontmatter field — Claude Code reads this natively to decide when to auto-invoke the skill. No external configuration file required.

Prompt templates that currently embed the search procedure via `<!-- include: relic snippet search-knowledge -->` are migrated to `<!-- use: relic.search-context -->`. The skill is lazy (loaded on demand); the snippet was eager (always in context). The `search-knowledge.md` snippet is retained with a deprecation note as a fallback for non-Claude engines.

---

## Implementation Phases

### Phase 1 — Create skill directories

Create `templates/skills/<name>/SKILL.md` for each of the 4 skills. Each skill is a **directory**, matching the `.claude/skills/<name>/SKILL.md` structure Claude Code expects natively.

1. **`search-context/SKILL.md`** — procedural skill (no `description` frontmatter, user-invoked). Two-step artifact discovery: targeted `relic search` → `relic deep-search` fallback. Richer than the snippet: scoring guidance, when to stop at Step A, explicit completion criteria.

2. **`check-intersections/SKILL.md`** — procedural skill (no `description` frontmatter, user-invoked). Load all `artifacts.json`, compare `owns` + `touches_files` across specs. Extracted from the repeated intersection check in specify/clarify/plan/tasks prompts.

3. **`smart-search/SKILL.md`** — proactive skill. Frontmatter `description`: "When the user asks how something works, what a concept means, or how a relic-tracked rule or domain applies — and the topic is in the relic shared brain." Must include: Confirmation gate, Do NOT list.

4. **`suggest-workflow/SKILL.md`** — proactive skill. Frontmatter `description`: "When conversation reveals a bug in code a relic spec owns, or a new feature being discussed that would benefit from a spec." Proposes `/relic.fix` or `/relic.specify`. Must include: Confirmation gate, Do NOT list.

### Phase 2 — Extend embed-engine-templates.ts

Add a third loop in `scripts/embed-engine-templates.ts`:

- Walk `templates/skills/` **recursively** — not just `SKILL.md`, but every file in every skill subdirectory, regardless of extension (`.sh`, `.py`, `.js`, `.ts`, `.md`, etc.)
- For each file, store content keyed by its relative path from `templates/skills/`: e.g. `search-context/SKILL.md`, `search-context/helper.sh`, `suggest-workflow/check.py`
- Emit a `SKILLS` export: `Record<string, string>` — key = relative path, value = file content
- Update the generated file header comment to mention skills

No changes to ENGINE_TEMPLATES or SNIPPETS exports — skills are a separate named export.

### Phase 3 — Extend engines/claude/index.ts

In `packages/engines/src/engines/claude/index.ts`:

1. Import `SKILLS` from `engine-templates.ts`.
2. Add a skill write loop after the existing PROMPT_NAMES loop:
   - Iterate `Object.entries(SKILLS)`
   - From each key (e.g. `search-context/SKILL.md`), derive: skill name = first path segment, relative file path = remaining segments
   - Create directory `.claude/skills/relic.<skill-name>/` if it doesn't exist
   - Write the file at `.claude/skills/relic.<skill-name>/<relative-path>` — replicating the full source tree

This handles arbitrary file types at any depth within a skill directory. No CLAUDE.md write.

### Phase 4 — Update preamble.md + migrate search-knowledge snippet in prompts

**preamble.md** receives a new **Directive System** section documenting both directive types:
- `<!-- include: relic snippet <name> -->` → call `relic snippet <name>` and apply the output in place
- `<!-- use: relic.<skill-name> -->` → invoke `/relic.<skill-name>` now as a sub-workflow

(The "Proactive Skills" section is no longer needed in preamble — `description` frontmatter handles auto-invocation natively.)

**Prompt migration:** Replace `<!-- include: relic snippet search-knowledge -->` with `<!-- use: relic.search-context -->` in:

- `templates/prompts/specify.md`
- `templates/prompts/plan.md`
- `templates/prompts/ask.md`

### Phase 5 — Deprecate search-knowledge snippet

Add a deprecation notice at the top of `templates/snippets/search-knowledge.md`:

> **Deprecated for Claude:** Use `<!-- use: relic.search-context -->` instead. This snippet is retained as a fallback for non-Claude engines only.

Do not delete the file.

### Phase 6 — Build and verify

```bash
bun run build:templates
```

Verify:
- `packages/engines/src/generated/engine-templates.ts` exports `SKILLS` with 4 entries
- Keys include at minimum `skills/search-context/SKILL.md`, `skills/check-intersections/SKILL.md`, `skills/smart-search/SKILL.md`, `skills/suggest-workflow/SKILL.md`; additional supporting files appear as sibling keys with their actual extension
- No TypeScript errors
- Spot-check: run `relic add-engine claude` in a temp dir; confirm `.claude/skills/relic.search-context/SKILL.md` exists

---

## File Changes

| File | Action | Notes |
|---|---|---|
| `templates/skills/search-context/SKILL.md` | Create | Procedural: two-step artifact discovery |
| `templates/skills/check-intersections/SKILL.md` | Create | Procedural: intersection check across specs |
| `templates/skills/smart-search/SKILL.md` | Create | Proactive: `description` frontmatter for auto-invoke |
| `templates/skills/suggest-workflow/SKILL.md` | Create | Proactive: `description` frontmatter for auto-invoke |
| `scripts/embed-engine-templates.ts` | Modify | Recursive walk — all files any extension in skills dirs → `export const SKILLS` |
| `packages/engines/src/generated/engine-templates.ts` | Generated | Rebuilt by build:templates — do not edit directly |
| `packages/engines/src/engines/claude/index.ts` | Modify | Import SKILLS, create skill dirs, replicate full file tree at write time |
| `templates/preamble.md` | Modify | Add Directive System section; remove search cascade |
| `templates/prompts/specify.md` | Modify | Replace search-knowledge include with use: directive |
| `templates/prompts/plan.md` | Modify | Replace search-knowledge include with use: directive |
| `templates/prompts/ask.md` | Modify | Replace search-knowledge include with use: directive |
| `templates/snippets/search-knowledge.md` | Modify | Add deprecation notice at top |

---

## Shared Artifact Changes

`shared/contracts/SkillExtractionContract.md` — owned by this spec; updated in clarify sessions (skill directory structure, `description` frontmatter mechanism, file ownership boundary). No further amendments at plan time.

---

## Intersection Notes

All intersections are coordinated and additive:

| File | Also in | Resolution |
|---|---|---|
| `scripts/embed-engine-templates.ts` | 002, 009, 010 | Additive: new SKILLS export only |
| `templates/prompts/specify.md` | 005, 008, 009, 010 | Additive: one-line directive replacement |
| `templates/prompts/plan.md` | 005, 006, 008, 009, 010 | Additive: one-line directive replacement |
| `templates/prompts/ask.md` | 009 | Additive: one-line directive replacement |
| `packages/engines/src/engines/claude/index.ts` | 007 | Additive: new skill directory write loop |
| `templates/preamble.md` | None | Additive: new Directive System section |

---

## Open Question Resolutions

**OQ-2:** This spec (011) owns Phase 6 build verification.
**OQ-3:** Proactive trigger wording now lives in `description` frontmatter — not preamble. smart-search: "user asks how something works / what a concept means and the topic is in the relic shared brain." suggest-workflow: "conversation reveals a bug in spec-owned code or a new feature discussion."
**OQ-4:** suggest-workflow uses `relic search <keywords>` + scan `artifacts.json touches_files`. No new CLI command needed.
**OQ-5:** Keep `search-knowledge.md` with deprecation note. Delete only when all engines support skills.
