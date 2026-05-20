# Spec: Ask Knowledge Query

**Spec ID:** 007-ask-knowledge-query
**Created:** 2026-05-19
**Status:** draft

---

## Overview

The `/relic.ask` command gives developers a safe, read-only way to query the shared knowledge layer before committing to a destructive workflow step (e.g. `specify`, `clarify`, `plan`). The user types a natural-language question and receives a grounded answer drawn from shared artifacts, specs, and fix documents — entirely in the terminal, without creating or modifying any file.

The motivation: when using Relic interactively, a developer often needs to check "does a contract for this already exist?", "which spec owns the payment domain?", or "what assumptions have we declared about third-party rate limits?" before deciding what to do next. Currently the only way to get this is to run `relic search` manually and read raw toon output. `/relic.ask` wraps that flow in an AI-mediated query that surfaces the right context and interprets it for the user.

---

## Requirements

### Functional Requirements

- FR-1: The command accepts a free-text question as its argument: `/relic.ask <question>`.
- FR-2: The command extracts relevant keywords from the question and runs `relic search <keywords>` to find the best matching entries across the full Relic knowledge base — shared artifacts (domains, contracts, rules, assumptions), specs, and fix documents.
- FR-3: The command reads the full content of the top-scoring results before composing its answer.
- FR-4: If the targeted search is insufficient, the command falls back to `relic search --deep` (all categories, unfiltered) and uses `tldr` fields to decide which files to read in full.
- FR-5: The command outputs a grounded answer to the terminal, citing which artifacts it drew from.
- FR-6: The command MUST NOT create, modify, or delete any file — this is an absolute invariant.
- FR-7: The command MUST NOT call `relic write`, `relic scaffold`, or any other mutating CLI command.
- FR-8: The command MUST NOT suggest, trigger, or imply any follow-on workflow step. Output is strictly the answer to the question — no "you may want to run /relic.clarify" or similar prompts.

### Non-Functional Requirements

- NFR-1: Implemented as a prompt file in `templates/prompts/ask.md`, following Constitution Principle II (workflow commands are prompts, not TypeScript).
- NFR-2: A TypeScript stub `packages/core/src/commands/ask.ts` is added for the debug binary, following the existing workflow command stub pattern.
- NFR-3: Wired into all engine outputs (Claude, Copilot, Codex) through the existing embed pipeline — no manual writes to engine directories.
- NFR-4: The prompt must state the non-destructive invariant at the top and repeat it in a "What NOT to do" section.

---

## User Stories

- As a developer, I want to ask "which spec owns the auth domain?" before starting a new spec so that I don't create an ownership conflict.
- As a developer, I want to ask "what assumptions have we declared about our payment provider?" before writing a clarification so that my clarification doesn't contradict an existing assumption.
- As a developer, I want to ask "has anyone already defined a contract for the order event?" before running `/relic.specify` so that I build on existing artifacts rather than duplicating them.
- As a developer, I want a read-only query path I can invoke freely, without worrying about accidentally mutating state.

---

## Scope

### In Scope

- New prompt file `templates/prompts/ask.md`
- TypeScript stub `packages/core/src/commands/ask.ts` (mirrors the pattern of other command stubs)
- Export from `packages/core/src/index.ts`
- Registration in `packages/cli-node/src/bin.debug.ts`
- Engine output files (`.claude/commands/relic.ask.md`, `.github/prompts/relic.ask.prompt.md`) generated automatically by the existing embed pipeline on next `bun run build:templates`

### Out of Scope

- No changes to `relic search` itself
- No new shared artifacts (the command is a consumer of existing search/artifact infrastructure)
- No TypeScript business logic — AI behaviour lives entirely in the prompt
- No changes to `packages/cli-node/src/bin.ts` (production binary) — ask is a workflow prompt command, debug binary only
- No stub in the production binary — users invoke `/relic.ask` through their AI agent, not directly from the CLI

---

## Shared Artifacts

**Owns:**
- (none — this spec introduces no new shared artifact)

**Reads:**
- `shared/domains/TemplateDomain.md` — this spec adds a new prompt template; must follow the TEMPLATES map embedding contract
- `shared/domains/SharedArtifactDomain.md` — the ask command queries the shared brain; understanding the domain model is required

---

## Open Questions

*(none — all resolved in clarify)*

---

## Decisions

- **OQ-1 resolved:** Search scope is the full Relic knowledge base — shared artifacts (domains, contracts, rules, assumptions), specs, and fix documents. No category is excluded.
- **OQ-2 resolved:** Output is strictly Q&A. No follow-on command suggestions of any kind.
- **OQ-3 resolved:** No stub in the production binary. Invocation is through the AI agent slash command only.
