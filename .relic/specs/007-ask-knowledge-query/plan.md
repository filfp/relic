# Plan: Ask Knowledge Query

**Spec ID:** 007-ask-knowledge-query
**Status:** ready

---

## Architecture Overview

`/relic.ask` is implemented entirely as a prompt file (`templates/prompts/ask.md`), following Constitution Principle II. The prompt instructs the AI agent to:

1. Extract keywords from the user's question
2. Run `relic search <keywords>` across the full knowledge base (shared artifacts, specs, fixes)
3. Read top-scoring results in full
4. Fall back to `relic search --deep` if targeted search is insufficient
5. Compose and output a grounded answer — no file mutations permitted

The TypeScript layer is minimal: a stub in `packages/core/src/commands/ask.ts` (same pattern as `clarify.ts`, `analyse.ts`, etc.) and a corresponding registration in `bin.debug.ts`. No business logic lives in TypeScript.

The engine distribution path is:
- `templates/prompts/ask.md` is picked up automatically by `scripts/embed-engine-templates.ts` (it walks all `*.md` files in `templates/prompts/`)
- All three engine writers (claude, copilot, codex) have a hardcoded `PROMPT_NAMES` array — `"ask"` must be appended to each
- On next `bun run build:templates`, `ask.md` is baked into `ENGINE_TEMPLATES` and written to `.claude/commands/relic.ask.md`, `.github/prompts/relic.ask.prompt.md`, and `.codex/commands/relic.ask.md`

---

## Implementation Phases

### Phase 1 — Prompt file

1. Create `templates/prompts/ask.md` with the full AI prompt:
   - Header enforcing the non-destructive invariant (no file writes, no mutating commands)
   - Step 1: extract keywords from the user's question
   - Step 2: run `relic search <keywords>` — searches shared artifacts, specs, and fix documents
   - Step 3: read full content of top-scoring results (use score to prioritise)
   - Step 4: if search is insufficient, fall back to `relic search --deep`, filter by `tldr`, then read selectively
   - Step 5: compose and output the answer, citing which artifacts were used
   - "What NOT to do" section: no `relic write`, no `relic scaffold`, no follow-on command suggestions

### Phase 2 — Engine writer registration

2. In `packages/engines/src/engines/claude/index.ts`: append `"ask"` to `PROMPT_NAMES`
3. In `packages/engines/src/engines/copilot/index.ts`: append `"ask"` to `PROMPT_NAMES`
4. In `packages/engines/src/engines/codex/index.ts`: append `"ask"` to `PROMPT_NAMES`

### Phase 3 — TypeScript stub and wiring

5. Create `packages/core/src/commands/ask.ts`:
   ```
   export interface AskOptions { relicDir: string; }
   export async function runAsk(_options: AskOptions): Promise<void> {
     console.log("relic ask — not yet implemented.");
     console.log("Use the /relic.ask prompt in your AI agent.");
   }
   ```
6. Add `export { runAsk } from "./commands/ask.ts";` to `packages/core/src/index.ts`
7. In `packages/cli-node/src/bin.debug.ts`:
   - Import `runAsk` from `@relic/core`
   - Register `program.command("ask").description("...").action(...)` following the pattern of other workflow stubs

### Phase 4 — Update artifacts.json

8. Add the three engine writer files to `touches_files` in `.relic/specs/007-ask-knowledge-query/artifacts.json`:
   - `packages/engines/src/engines/claude/index.ts`
   - `packages/engines/src/engines/copilot/index.ts`
   - `packages/engines/src/engines/codex/index.ts`

---

## File Changes

| File | Action | Notes |
|------|--------|-------|
| `templates/prompts/ask.md` | create | Main deliverable — the AI prompt |
| `packages/engines/src/engines/claude/index.ts` | modify | Append `"ask"` to `PROMPT_NAMES` |
| `packages/engines/src/engines/copilot/index.ts` | modify | Append `"ask"` to `PROMPT_NAMES` |
| `packages/engines/src/engines/codex/index.ts` | modify | Append `"ask"` to `PROMPT_NAMES` |
| `packages/core/src/commands/ask.ts` | create | Workflow stub following clarify/analyse pattern |
| `packages/core/src/index.ts` | modify | Export `runAsk` |
| `packages/cli-node/src/bin.debug.ts` | modify | Register `relic ask` command |
| `.relic/specs/007-ask-knowledge-query/artifacts.json` | modify | Add engine writer files to `touches_files` |

---

## Shared Artifact Changes

(none — this spec creates no new shared artifacts and modifies none)

---

## Intersection Notes

- `packages/core/src/index.ts` and `packages/cli-node/src/bin.debug.ts` are touched by multiple specs (003, 004, 005, 006). No ownership conflict — `touches_files` overlaps are permitted; only `owns` conflicts are blocked.
- `templates/prompts/ask.md` is net-new; no other spec touches it.
- Engine writers (`claude/index.ts`, `copilot/index.ts`, `codex/index.ts`) — no other spec currently lists these in `touches_files`. No conflict.

---

## Changelog Reference

(none — no existing shared artifact was amended in this plan)
