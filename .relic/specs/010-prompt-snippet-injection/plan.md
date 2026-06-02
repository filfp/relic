# Plan: Prompt Modularization

**Spec:** 010-prompt-snippet-injection
**Status:** ready to implement

---

## Architecture Overview

The implementation extends the existing `embed-engine-templates.ts` → `ENGINE_TEMPLATES` pipeline in three minimal ways:

1. **SNIPPETS registry** — `embed-engine-templates.ts` walks `templates/snippets/` and bakes a `SNIPPETS: Record<string, string>` map (key = filename without `.md`). Exported alongside `ENGINE_TEMPLATES` in `packages/engines/src/generated/engine-templates.ts`. Exposed from `@relic/engines`.

2. **Skill standalone entries** — `embed-engine-templates.ts` also walks `templates/skills/` and adds those files to `ENGINE_TEMPLATES` with keys `skills/<name>.md`. `writeClaude()` detects skill keys by prefix and writes them to `.claude/commands/relic.<name>.md`.

3. **`relic snippet` command** — reads from the baked `SNIPPETS` registry, expands nested `<!-- include: relic snippet <name> -->` directives depth-first, detects cycles, outputs to stdout.

**No build-time directive resolution.** Directives travel verbatim through the entire pipeline (bake → `.claude/commands/` deploy → LLM execution). Templates remain fully portable and self-describing.

---

## FR-17 Preamble Consolidation Decision

Audited the two preamble variants:

| Snippet | Lines | Current usage |
|---|---|---|
| Standard: `> Read .relic/preamble.md. It defines where artifacts belong. Violating those rules...` | 2 | specify, clarify, plan, analyse, tasks, implement, scan, use, constitution, solve, ask |
| Extended: `> Read .relic/preamble.md and .relic/constitution.md in full. The preamble defines structural invariants... constitution amendment authorising the deviation must exist...` | 4 | fix only |

**Decision: merge to one universal `preamble-guard.md` using the extended language.** The extended preamble is strictly more cautious — applying it universally adds two lines to non-fix commands without any behavioural regression. This reduces the snippet set from 5 to 4, satisfying FR-17's "fewer is better" principle.

---

## Implementation Phases

### Phase 1 — Snippet Files (no code, no build step)

Create `templates/snippets/` with 4 files:

| File | Content | Replaces |
|---|---|---|
| `preamble-guard.md` | 4-line extended preamble blockquote | Both the 2-line standard and 4-line extended variants |
| `constitution-load.md` | `1. Read \`.relic/constitution.md\`.` — the exact one-line instruction | The verbatim line in 5+ templates |
| `html-anti-transcription-common.md` | The 3 universal anti-transcription rules (Do NOT copy verbatim; use tables/chips/progress; if it looks like Markdown source, you're doing it wrong) | The 3-rule block in 5 templates |
| `html-inline-reader.md` | The full "Populate the inline reader source blocks" instruction with 3 `<script type="text/plain">` replacement instructions | The ~8-line block in 5 templates |

Content for each snippet is extracted verbatim from the current templates where it first appears. No content invented.

### Phase 2 — Skill Files (no code, no build step)

Create `templates/skills/` with 2 files:

**`search-context.md`** — `/relic.search-context` slash command. Contains the two-step artifact discovery procedure extracted from `specify.md` and `plan.md`:
- Step A: `relic search <keyword1> <keyword2> ...`, read high-score entries, stop if coverage is sufficient
- Step B (fallback): `relic search --deep`, read `tldr` fields only, selectively load relevant files
- The file is a complete, standalone Markdown document with its own `<!-- include: relic snippet preamble-guard -->` preamble.

**`check-intersections.md`** — `/relic.check-intersections` slash command. Contains the intersection check procedure extracted from `clarify.md` and `plan.md`:
- Load all `specs/*/artifacts.json`
- Compare `owns` and `touches_files` for conflicts with the current spec's planned changes
- Flag any conflict explicitly; do not proceed until resolved
- Also uses `<!-- include: relic snippet preamble-guard -->` as its opening preamble.

Both skill files demonstrate snippet composition inside skills (FR-13).

### Phase 3 — embed-engine-templates.ts Extension

Extend the script to emit two additional exports in `packages/engines/src/generated/engine-templates.ts`:

- **SNIPPETS map**: Walk `templates/snippets/*.md`. Key = filename without `.md` (e.g., `preamble-guard`). Value = file content. Emitted as a second `export const SNIPPETS: Record<string, string> = { ... }` block.
- **Skill entries in ENGINE_TEMPLATES**: Walk `templates/skills/*.md`. Key = `skills/<name>.md`. Value = file content. Added to the existing `ENGINE_TEMPLATES` map using the same key → escaped-content pattern.

Implementation: add two additional `collectFiles(dir)` → escape → push loops after the existing prompts loop. The output template string gets a second export block.

Also update `packages/engines/src/index.ts`:
```typescript
export { SNIPPETS } from "./generated/engine-templates.ts";
```

### Phase 4 — relic snippet Command

**`packages/core/src/commands/snippet.ts`** (new file):

```
resolveSnippet(name, snippets, visiting: ReadonlySet<string>): string
  - if visiting.has(name) → stderr "[snippet] Circular include: <chain>" → exit(1)
  - if snippets[name] === undefined → stderr "[snippet] Unknown snippet: <name>" → exit(1)
  - create next = new Set(visiting).add(name)
  - replace all <!-- include: relic snippet <dep> --> with resolveSnippet(dep, snippets, next)
  - return expanded string

runSnippet(name: string): void
  - import SNIPPETS from @relic/engines
  - stdout.write(resolveSnippet(name, SNIPPETS, new Set()))
```

Resolution logic target: ≤ 30 lines (NFR-2 constraint).

**`packages/core/src/index.ts`:** add `export { runSnippet } from "./commands/snippet.ts"`.

**`packages/cli-node/src/bin.ts`:** add `relic snippet <name>` command:
```typescript
program
  .command("snippet <name>")
  .description("Output named snippet content from baked SNIPPETS registry")
  .action((name: string) => { runSnippet(name); });
```

### Phase 5 — Claude Engine: Skill Write Logic

**`packages/engines/src/engines/claude/index.ts`:**

After the existing `PROMPT_NAMES` write loop, add skill detection by ENGINE_TEMPLATES key prefix:

```typescript
const skillEntries = Object.entries(ENGINE_TEMPLATES)
  .filter(([key]) => key.startsWith("skills/"));
for (const [key, content] of skillEntries) {
  const name = key.slice("skills/".length).replace(/\.md$/, "");
  writeText(join(commandsDir, `relic.${name}.md`), content);
}
```

This is prefix-based — adding new skill files to `templates/skills/` automatically causes them to be written, with no code change needed.

Update the console.log to report skill count separately from command count.

**`packages/core/src/commands/init.ts`:** No changes needed. `runInit` already calls `runAddEngine` → `writeClaude`. Skills are written automatically via the extended `writeClaude`.

### Phase 6 — Template Updates

Update templates in order of highest duplication impact:

**`templates/preamble.md`:**
- Replace the embedded two-step search cascade with `<!-- use: relic.search-context -->`
- Add a directive documentation section explaining both directive types to the LLM:
  - `<!-- include: relic snippet <name> -->` → call `relic snippet <name>` and apply the output as context
  - `<!-- use: relic.<skill-name> -->` → invoke `/relic.<skill-name>` at this point in the workflow

**Each of the 12 `templates/prompts/*.md` files:**
- Replace the opening preamble blockquote (2-line or 4-line) with `<!-- include: relic snippet preamble-guard -->`
- Replace the `Read .relic/constitution.md` instruction with `<!-- include: relic snippet constitution-load -->` (where applicable)
- Replace the HTML anti-transcription rules block with `<!-- include: relic snippet html-anti-transcription-common -->`
- Replace the "Populate the inline reader source blocks" instruction with `<!-- include: relic snippet html-inline-reader -->`
- In `specify.md` and `plan.md`: replace the Step A/B artifact search procedure with `<!-- use: relic.search-context -->`
- In `specify.md`, `clarify.md`, `plan.md`, `tasks.md`: replace the intersection check prose with `<!-- use: relic.check-intersections -->`
- Replace any prose like "Run `/relic.search-context` before proceeding" with `<!-- use: relic.search-context -->`

Templates without an HTML mode section (`scan`, `use`, `ask`, `constitution`) skip the html snippet directives.

`fix.md` note: the universal `preamble-guard.md` already contains the constitution mention, so `fix.md` only needs `<!-- include: relic snippet preamble-guard -->` for its opening — no separate constitution-load directive needed.

### Phase 7 — Build + Verify

```bash
bun run build:templates

# Verify SNIPPETS registry emitted
grep "export const SNIPPETS" packages/engines/src/generated/engine-templates.ts

# Verify skill entries in ENGINE_TEMPLATES
grep "skills/search-context" packages/engines/src/generated/engine-templates.ts

# Test snippet command
relic snippet preamble-guard   # should output 4-line extended preamble
relic snippet unknown-name     # should exit non-zero with [snippet] Unknown snippet: unknown-name

# Verify .claude/commands/ includes skills on relic init
relic init --dir /tmp/test-relic-skills --force
ls /tmp/test-relic-skills/.claude/commands/ | grep "relic\."
# expected: relic.check-intersections.md  relic.search-context.md  relic.specify.md  ...
```

---

## File Changes

| File | Action | Phase |
|---|---|---|
| `templates/snippets/preamble-guard.md` | Create | 1 |
| `templates/snippets/constitution-load.md` | Create | 1 |
| `templates/snippets/html-anti-transcription-common.md` | Create | 1 |
| `templates/snippets/html-inline-reader.md` | Create | 1 |
| `templates/skills/search-context.md` | Create | 2 |
| `templates/skills/check-intersections.md` | Create | 2 |
| `scripts/embed-engine-templates.ts` | Modify — add SNIPPETS + skills baking loops | 3 |
| `packages/engines/src/generated/engine-templates.ts` | Auto-generated — gains SNIPPETS export + skill entries | 3 |
| `packages/engines/src/index.ts` | Modify — add `export { SNIPPETS }` | 3 |
| `packages/core/src/commands/snippet.ts` | Create — runSnippet with cycle detection | 4 |
| `packages/core/src/index.ts` | Modify — add `export { runSnippet }` | 4 |
| `packages/cli-node/src/bin.ts` | Modify — register `relic snippet <name>` command | 4 |
| `packages/engines/src/engines/claude/index.ts` | Modify — add skill write loop (prefix detection) | 5 |
| `templates/preamble.md` | Modify — search mandate + directive docs | 6 |
| `templates/prompts/specify.md` | Modify — preamble, constitution, html×2, search skill, intersections skill | 6 |
| `templates/prompts/clarify.md` | Modify — preamble, constitution, intersections skill | 6 |
| `templates/prompts/plan.md` | Modify — preamble, constitution, html×2, search skill, intersections skill | 6 |
| `templates/prompts/analyse.md` | Modify — preamble, constitution | 6 |
| `templates/prompts/tasks.md` | Modify — preamble, constitution, html×2, intersections skill | 6 |
| `templates/prompts/implement.md` | Modify — preamble, constitution, html×2 | 6 |
| `templates/prompts/fix.md` | Modify — preamble (universal, contains constitution), html×2 | 6 |
| `templates/prompts/scan.md` | Modify — preamble | 6 |
| `templates/prompts/use.md` | Modify — preamble | 6 |
| `templates/prompts/constitution.md` | Modify — preamble | 6 |
| `templates/prompts/solve.md` | Modify — preamble, constitution | 6 |
| `templates/prompts/ask.md` | Modify — preamble | 6 |
| `packages/core/src/commands/init.ts` | No changes needed | — |

---

## Shared Artifact Changes

Both owned contracts are already written and up to date. No new artifacts created. No existing artifacts modified by this plan.

| Artifact | Status |
|---|---|
| `shared/contracts/SnippetIncludeContract.md` | Current — written during clarify sessions |
| `shared/contracts/SkillExtractionContract.md` | Current — written during clarify sessions |

---

## Intersection Notes

All `touches_files` overlaps are with specs that have already been fully implemented. No active spec conflicts.

| File | Overlapping specs | Resolution |
|---|---|---|
| `scripts/embed-engine-templates.ts` | spec 002 (implemented) | Additive: new loops only; existing ENGINE_TEMPLATES output unchanged for no-directive templates |
| `templates/prompts/*.md` | specs 003, 005, 006, 007, 008, 009 (all implemented) | Additive: directives replace verbatim text; effective content identical when resolved by LLM |
| `templates/preamble.md` | spec 005 (implemented) | Additive: new section + directive replaces search cascade |
| `packages/cli-node/src/bin.ts` | specs 003–009 (all implemented) | Additive: new command only, no existing commands modified |
| `packages/engines/src/engines/claude/index.ts` | spec 007 (implemented) | Additive: new skill write loop after existing command loop |
| `packages/core/src/commands/init.ts` | specs 003, 004, 005, 008, 009 (all implemented) | No changes needed — skill write is automatic via writeClaude |

**NFR-5 check:** `.claude/commands/` gains exactly 2 new files (`relic.search-context.md`, `relic.check-intersections.md`). No existing command files removed or modified.

---

## Changelog Reference

No changelog entry needed for plan creation. Both owned contracts were created during the clarify sessions and their changelog entries were written at that time.
