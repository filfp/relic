# Plan: Claude Plugin — Ambient SDD

**Spec ID:** 011-claude-plugin
**Status:** ready
**Planned:** 2026-07-02 (against the reframed spec — plugin delivery + ambient SDD)

---

## Architecture Overview

Four layers, ordered so every later layer consumes a verified earlier one:

1. **Facts first.** Claude Code plugin schemas move fast — the first phase pins the exact
   `plugin.json` / `marketplace.json` shapes, command/skill frontmatter fields, the
   namespace form of plugin commands, and the settings keys for team plugin
   recommendation, against the live docs (OQ-1). Everything downstream depends on this;
   the contract is written from these findings, not from memory.

2. **Plugin as build output + authored skills.** `plugin/commands/` is **generated** from
   `templates/prompts/*.md` by `scripts/build-plugin.ts` (adds frontmatter:
   `description`, `allowed-tools` with `Bash(relic *)`; preserves snippet include
   directives verbatim). `plugin/skills/<name>/SKILL.md` are **authored** — they are
   Claude-native prose, not derived from prompts. `plugin/.claude-plugin/plugin.json` and
   the repo-root `.claude-plugin/marketplace.json` are static files whose `version` is
   bumped by `scripts/publish.ts`.

3. **CLI support surface.** Two small, testable changes: `config.json` `"sdd"` knob
   (`readSdd` in `@relic/utility`, default `"auto"`) surfaced as `sdd` in `relic context`
   output; claude engine rewrite (`writeClaude` stops emitting command files, writes
   settings permission + plugin recommendation keys, prints install instructions);
   `relic upgrade --clean` removes superseded `.claude/commands/relic.*.md` copies
   (gated per OQ-4).

4. **Practice layer.** The autonomy ladder and ambient-SDD practice live in three places
   that must agree: the four skill bodies (Claude, enforcement), the new
   `templates/preamble.md` Ambient SDD section (all engines, philosophy), and
   `ClaudePluginContract.md` (knowledge layer, source of truth).

### Skill design (the heart of the spec)

Each skill's `description` frontmatter is the auto-invocation trigger — written as
situation descriptions, not feature descriptions:

| Skill | Trigger description sketch | Body teaches |
|---|---|---|
| `relic-knowledge-first` | "before exploring code, answering how/why questions, or planning changes in a repo with a .relic/ directory" | search-first cascade, artifact loading, silence |
| `relic-spec-detector` | "user requests a new feature/capability in a relic project" | new-capability vs clarify routing, announce-then-specify, continue into the work |
| `relic-fix-pipeline` | "user reports a bug/error/regression, or a defect surfaces in spec-owned code" | fix-as-debugging-method, owning-spec resolution, classification, solve per ladder |
| `relic-doc-keeper` | "after implementing or changing code in a relic project, before declaring work done" | closing the loop: tasks, drift, changelog, owned artifacts, HTML at milestones (OQ-2) |

Every skill body opens with the same two guards (FR-9: inactive without `.relic/`; CLI
missing → one-line install mention) and the autonomy ladder table (FR-10) with the
`sdd` knob check (FR-11) — shared text kept identical across the four files by the build
script asserting a common block, not by runtime includes (plugin skills must be
self-contained).

---

## Implementation Phases

### Phase 1 — Verify platform facts (OQ-1, OQ-3)

1. Pull current Claude Code docs for: plugin manifest schema, marketplace schema, command
   frontmatter, skill frontmatter + auto-invocation, command namespacing, settings keys
   for recommending plugins to a team, local plugin testing flags.
2. Record findings in `ClaudePluginContract.md` (created in this phase, owned by 011).
3. Audit `/relic.command` spelling across templates/docs; decide the rename map (NFR-4).

### Phase 2 — Plugin scaffold + build

1. `plugin/.claude-plugin/plugin.json`, repo-root `.claude-plugin/marketplace.json`.
2. `scripts/build-plugin.ts`: prompts → `plugin/commands/*.md` with frontmatter; wire into
   `build:templates` chain. Generated commands are **committed** (not gitignored) so the
   repo is installable as a marketplace without a build step; the script asserts
   freshness in CI.
3. `scripts/publish.ts`: bump plugin.json version in lockstep.

### Phase 3 — Ambient skills

1. Author the four `plugin/skills/<name>/SKILL.md` per the table above.
2. Shared guard/ladder block consistency check in `build-plugin.ts`.

### Phase 4 — CLI support

1. `@relic/utility`: `sdd` field on `ProjectConfig` (`"auto" | "suggest"`, default auto)
   + `readSdd`; `relic context` exposes it; `ContextResultContract.md` amended (additive,
   cross-spec — changelog).
2. `writeClaude()` rewrite per FR-13; `add-engine`/`init` output text updated.
3. `relic upgrade --clean` removal of superseded command copies (FR-14, OQ-4 gate).
4. Tests: config knob round-trip; context field; engine writer output; upgrade cleanup.

### Phase 5 — Practice + docs

1. `templates/preamble.md` Ambient SDD section (FR-16).
2. README + docs: install path (`/plugin marketplace add filfp/relic`), command namespace
   rename pass, engine table update.
3. Changelog entries; 011 HTML deep pass; `relic validate` clean.

### Phase 6 — Verification

1. Local plugin load in a sandbox project (plugin-dir/local marketplace flow from Phase 1
   findings): commands appear, skills fire on matching situations, `sdd: suggest`
   downgrades structural actions.
2. Full suite + typecheck; e2e: `add-engine claude` on a fresh project writes settings
   only; `upgrade --clean` removes old copies.

---

## File Changes

| File | Action | Notes |
|------|--------|-------|
| `plugin/.claude-plugin/plugin.json` | create | manifest; version synced by publish |
| `.claude-plugin/marketplace.json` | create | repo as its own marketplace |
| `plugin/commands/*.md` | generate | from templates/prompts via build-plugin.ts (committed) |
| `plugin/skills/{relic-knowledge-first,relic-spec-detector,relic-fix-pipeline,relic-doc-keeper}/SKILL.md` | create | authored ambient skills |
| `scripts/build-plugin.ts` | create | generation + consistency assertions |
| `scripts/publish.ts` | modify | plugin version bump |
| `packages/utility/src/project-config.ts` | modify | `sdd` knob + `readSdd` |
| `packages/core/src/commands/context.ts` | modify | `sdd` field |
| `packages/engines/src/engines/claude/index.ts` | modify | settings + recommendation, no command copies |
| `packages/core/src/commands/upgrade.ts` | modify | `--clean` superseded-copy removal |
| `packages/cli-node/src/bin.ts` / `bin.debug.ts` | modify | upgrade flag |
| `templates/preamble.md` | modify | Ambient SDD section |
| `README.md`, `docs/distribution.md` | modify | install path, namespace rename |
| tests (utility, core, engines) | modify/create | knob, context, engine writer, upgrade |

---

## Shared Artifact Changes

| Artifact | Action | Approved by |
|----------|--------|-------------|
| `shared/contracts/ClaudePluginContract.md` | create (Phase 1) | 011 owns |
| `shared/contracts/SkillExtractionContract.md` | supersede — historical pointer to ClaudePluginContract | 011 owns |
| `shared/domains/ProjectConfigDomain.md` | update — `sdd` field | cross-spec (008 owns) — changelog required |
| `shared/contracts/ContextResultContract.md` | update — `sdd` field | cross-spec (003 owns) — changelog required |

---

## Intersection Notes

- **`ContextResultContract.md` (003) and `ProjectConfigDomain.md` (008):** both gain the
  additive `sdd` field. Same pattern as spec 009's OQ-1 — changelog at plan time (this
  document) and amendment with provenance at implementation time.
- **`templates/prompts/`:** shared with 009/010 surfaces. This spec does not edit prompt
  *content* (only the generator consumes them); the namespace-spelling audit (OQ-3) may
  touch prose references — additive text changes only.
- **`writeClaude()` / `upgrade.ts`:** owned surface of specs 002 (permissions) and 004
  (upgrade). The permission write is preserved verbatim; upgrade changes are additive
  behind `--clean`.
- **Spec 001 (workflow test suite):** engine tests asserting 12 command files written for
  claude will be rewritten to assert the new behaviour — flagged as expected test churn.

---

## Changelog Reference

- Plan-time entry: reframe record (skill extraction → claude plugin, D-1..D-4) + cross-spec
  notice for `ContextResultContract.md` and `ProjectConfigDomain.md`.
- Implementation-time entries expected for both cross-spec amendments.
