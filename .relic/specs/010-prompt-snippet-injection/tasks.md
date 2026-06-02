# Tasks: Prompt Snippet Injection

**Spec ID:** 010-prompt-snippet-injection
**Generated from plan:** 2026-06-02 (post-split revision)

---

## Notes

**Plan divergence:** `plan.md` was renumbered after the 010/011 spec split removed Phases 2 (skill files) and 5 (Claude engine write loop), which now belong to `011-skill-extraction`. Tasks below reflect 010's actual scope only; phase numbers here match the renumbered plan (Phases 1–5).

**Template overlap with 011:** Both specs modify `templates/prompts/*.md` and `scripts/embed-engine-templates.ts`. 010's changes must land first:
- 010 adds `<!-- include: relic snippet ... -->` directives (static block replacements)
- 011 then adds `<!-- use: relic.<skill-name> -->` directives (procedure replacements)

**Blocked tasks:** None — 010 has no external spec dependencies.

---

## Phase 1 — Snippet Files

*Create `templates/snippets/` with 4 plain Markdown fragment files. No code, no build step.*

- [x] **T-01** Create `templates/snippets/preamble-guard.md` — 4-line extended preamble blockquote (universal variant, replaces both 2-line and 4-line forms)
- [x] **T-02** Create `templates/snippets/constitution-load.md` — the exact 1-line `Read .relic/constitution.md` instruction
- [x] **T-03** Create `templates/snippets/html-anti-transcription-common.md` — the 3 universal anti-transcription rules common to all HTML-mode commands
- [x] **T-04** Create `templates/snippets/html-inline-reader.md` — the "Populate the inline reader source blocks" instruction with the 3 `<script type="text/plain">` replacement steps

---

## Phase 2 — embed-engine-templates.ts Extension (SNIPPETS only)

*Add SNIPPETS registry bake. Skill entries in ENGINE_TEMPLATES are out of scope (see 011).*

- [x] **T-05** Extend `scripts/embed-engine-templates.ts` to walk `templates/snippets/*.md` and emit `export const SNIPPETS: Record<string, string> = { ... }` in `packages/engines/src/generated/engine-templates.ts`. Key = filename without `.md`. Append after the existing `ENGINE_TEMPLATES` block.
- [x] **T-06** Add `export { SNIPPETS } from "./generated/engine-templates.ts"` to `packages/engines/src/index.ts`

---

## Phase 3 — relic snippet Command

*New CLI command and supporting module. ≤ 30 lines of resolution logic (NFR-2).*

- [x] **T-07** Create `packages/core/src/commands/snippet.ts` with:
  - `resolveSnippet(name, snippets, visiting)` — depth-first expansion, cycle detection (exit 1 on cycle or unknown name), replaces `<!-- include: relic snippet <dep> -->` recursively
  - `runSnippet(name)` — imports `SNIPPETS` from `@relic/engines`, calls `resolveSnippet`, writes result to stdout
- [x] **T-08** Add `export { runSnippet } from "./commands/snippet.ts"` to `packages/core/src/index.ts`
- [x] **T-09** Register `relic snippet <name>` command in `packages/cli-node/src/bin.ts` — delegates to `runSnippet(name)` from `@relic/core`

---

## Phase 4 — Template Updates (snippet directives only)

*Replace static repeated blocks with `<!-- include: relic snippet <name> -->` directives. Do NOT add `<!-- use: relic.* -->` skill directives — that is 011's job.*

- [x] **T-10** Update `templates/prompts/specify.md` — replace preamble blockquote with `preamble-guard`, constitution load with `constitution-load`, HTML anti-transcription block with `html-anti-transcription-common`, inline reader block with `html-inline-reader`
- [x] **T-11** Update `templates/prompts/clarify.md` — replace preamble blockquote with `preamble-guard`, constitution load with `constitution-load`
- [x] **T-12** Update `templates/prompts/plan.md` — replace preamble blockquote with `preamble-guard`, constitution load with `constitution-load`, HTML anti-transcription block with `html-anti-transcription-common`, inline reader block with `html-inline-reader`
- [x] **T-13** Update `templates/prompts/analyse.md` — replace preamble blockquote with `preamble-guard` (no standalone constitution step exists in this template)
- [x] **T-14** Update `templates/prompts/tasks.md` — replace preamble blockquote with `preamble-guard`, constitution load with `constitution-load`, HTML anti-transcription block with `html-anti-transcription-common`, inline reader block with `html-inline-reader`
- [x] **T-15** Update `templates/prompts/implement.md` — replace preamble blockquote with `preamble-guard`, constitution load with `constitution-load`, HTML anti-transcription block with `html-anti-transcription-common`, inline reader block with `html-inline-reader`
- [x] **T-16** Update `templates/prompts/fix.md` — replace preamble blockquote with `preamble-guard` (universal preamble already includes constitution mention — no separate `constitution-load` directive needed)
- [x] **T-17** Update `templates/prompts/scan.md` — add `preamble-guard` directive after heading (no existing blockquote)
- [x] **T-18** Update `templates/prompts/use.md` — replace preamble blockquote with `preamble-guard`
- [x] **T-19** Update `templates/prompts/constitution.md` — add `preamble-guard` directive after heading (no existing blockquote)
- [x] **T-20** Update `templates/prompts/solve.md` — replace preamble blockquote with `preamble-guard` (no standalone constitution step exists in this template)
- [x] **T-21** Update `templates/prompts/ask.md` — replace preamble blockquote with `preamble-guard`

---

## Phase 5 — Build + Verify

- [x] **T-22** Run `bun run build:templates` — confirm `packages/engines/src/generated/engine-templates.ts` regenerates cleanly
- [x] **T-23** Verify `export const SNIPPETS` block appears in `engine-templates.ts` with all 4 snippet keys
- [x] **T-24** Test `relic snippet preamble-guard` — outputs the 4-line extended preamble to stdout
- [x] **T-25** Test `relic snippet unknown-name` — exits non-zero with `[snippet] Unknown snippet: unknown-name`
- [x] **T-26** Test nested directive expansion — a snippet that includes another snippet resolves correctly
- [x] **T-27** Run `bun run build:binary` — confirm the CLI binary builds and `relic snippet --help` is registered
