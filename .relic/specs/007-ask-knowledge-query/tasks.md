# Tasks: Ask Knowledge Query

**Spec ID:** 007-ask-knowledge-query
**Generated from plan:** 2026-05-19

---

## Phase 1 — Prompt file

- [x] **T-01** Create `templates/prompts/ask.md`
  - Header section: state the non-destructive invariant up front — no file writes, no mutating commands, no follow-on suggestions
  - **Step 1:** Extract keywords from the user's question
  - **Step 2:** Run `relic search <keywords>` — searches shared artifacts (domains, contracts, rules, assumptions), specs, and fix documents
  - **Step 3:** For each result, use the `score` field to prioritise; read full content of top-scoring entries
  - **Step 4 (fallback):** If targeted search yields insufficient coverage, run `relic search --deep`; filter candidates by `tldr` field; read full files selectively
  - **Step 5:** Compose and output the answer, citing the artifact `name` and `path` of each source used
  - **"What NOT to do" section:** no `relic write`, no `relic scaffold`, no creating or modifying files, no suggesting follow-on commands

## Phase 2 — Engine writer registration

- [x] **T-02** In `packages/engines/src/engines/claude/index.ts`, append `"ask"` to `PROMPT_NAMES`
  - Current array ends with `"constitution"`; append after it
  - No other change to this file

- [x] **T-03** In `packages/engines/src/engines/copilot/index.ts`, append `"ask"` to `PROMPT_NAMES`
  - Same array pattern as claude engine; append `"ask"` after `"constitution"`

- [x] **T-04** In `packages/engines/src/engines/codex/index.ts`, append `"ask"` to `PROMPT_NAMES`
  - Same array pattern; append `"ask"` after `"constitution"`

## Phase 3 — TypeScript stub and wiring

- [x] **T-05** Create `packages/core/src/commands/ask.ts`
  - Export interface `AskOptions { relicDir: string; }`
  - Export `async function runAsk(_options: AskOptions): Promise<void>` — stub body prints "not yet implemented" and directs user to the AI agent prompt, matching the pattern of `clarify.ts`, `analyse.ts`, `tasks.ts`, `implement.ts`

- [x] **T-06** In `packages/core/src/index.ts`, add export for the new command
  - Add `export { runAsk } from "./commands/ask.ts";`
  - Add `export type { AskOptions } from "./commands/ask.ts";`
  - Place alongside the other workflow command exports

- [x] **T-07** In `packages/cli-node/src/bin.debug.ts`, register the `relic ask` command
  - Import `runAsk` from `@relic/core`
  - Register `program.command("ask")` with a description ("Query the shared knowledge layer")
  - Action calls `await runAsk({ relicDir })` following the pattern of `clarify`, `analyse`, `tasks`, `implement`

---

## Notes

- **T-01 is the critical deliverable.** T-02–T-07 are mechanical; the quality of the prompt is what makes the command useful.
- **T-02, T-03, T-04 are independent** — all three engine writers can be updated in any order.
- **T-05 must precede T-06 and T-07** — the export and registration depend on the stub existing.
- **T-06 must precede T-07** — `bin.debug.ts` imports from `@relic/core`, which requires T-06.
- **Engine template regeneration:** After T-01 is complete, `bun run build:templates` will automatically pick up `ask.md` (the embed script walks all `*.md` files in `templates/prompts/`). The `PROMPT_NAMES` changes in T-02–T-04 are required for the engine writers to actually output the file to `.claude/commands/relic.ask.md` etc.
- **No task overlap with other specs:** All tasks in specs 001–006 touching `bin.debug.ts`, `core/src/index.ts`, and the engine writers are marked `[x]`. No concurrent conflict.
- **artifacts.json already updated** during `/relic.plan` — no task required.
