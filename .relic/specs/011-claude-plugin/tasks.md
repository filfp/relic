# Tasks: Claude Plugin — Ambient SDD

**Spec ID:** 011-claude-plugin
**Generated from plan:** 2026-07-02

---

## Tasks

### Phase 1 — Fact re-check + rename map

- [x] **T-1** Re-check ClaudePluginContract schema notes against docs (pinned at plan time — quick drift guard)
- [x] **T-2** Build and apply the `/relic.command` → `/relic:command` rename map across `templates/` (prompts, snippets, preamble), README, docs — historical records (changelog, fixes) untouched (OQ-3)

### Phase 2 — Plugin scaffold + build

- [x] **T-3** `plugin/.claude-plugin/plugin.json` (name relic, version synced, metadata per contract)
- [x] **T-4** `.claude-plugin/marketplace.json` at repo root (`source: "./plugin"`)
- [x] **T-5** `scripts/build-plugin.ts`: generate `plugin/commands/*.md` from `templates/prompts/*.md` with frontmatter (description + `allowed-tools: Bash(relic *)`); `--check` mode asserts freshness; authored files (setup.md) never clobbered
- [x] **T-6** Wire generation into the build chain (`build:templates`) and CI freshness check
- [x] **T-7** `scripts/publish.ts`: bump plugin.json version in lockstep with CLI

### Phase 3 — Ambient skills + CLI bootstrap

- [x] **T-8** Shared blocks: universal guards (inactive without `.relic/`) + autonomy ladder (+ `sdd` knob check) + CLI bootstrap (FR-17, consent-gated npm/uv install, once per session)
- [x] **T-9** `plugin/skills/relic-knowledge-first/SKILL.md` (FR-5)
- [x] **T-10** `plugin/skills/relic-spec-detector/SKILL.md` (FR-6)
- [x] **T-11** `plugin/skills/relic-fix-pipeline/SKILL.md` (FR-7)
- [x] **T-12** `plugin/skills/relic-doc-keeper/SKILL.md` (FR-8 — HTML files never touched, D-9)
- [x] **T-13** `plugin/commands/setup.md` — authored `/relic:setup` onboarding command (FR-18)
- [x] **T-14** `build-plugin.ts` consistency assertion: shared blocks identical across the four skills

### Phase 4 — CLI support

- [x] **T-15** `@relic/utility`: `sdd` field on ProjectConfig (`auto` default | `suggest`) + `readSdd`; exports; tests
- [x] **T-16** `relic context`: `sdd` field in output (+ text rendering); test
- [x] **T-17** `writeClaude()` rewrite (FR-13): settings permission + `extraKnownMarketplaces` + `enabledPlugins`, no command files, install instructions printed; idempotent
- [x] **T-18** `relic upgrade --clean`: remove superseded `.claude/commands/relic.*.md` copies, report each (FR-14/OQ-4); bin flag plumbing
- [x] **T-19** Tests: engine writer rewrite (replaces the 12-file assertions), upgrade cleanup, knob round-trip

### Phase 5 — Practice + docs + knowledge layer

- [x] **T-20** `templates/preamble.md`: Ambient SDD section (FR-16) + spelling rename
- [x] **T-21** README + docs/distribution.md: plugin install path, engine table, spellings
- [x] **T-22** Amend `ContextResultContract.md` (003) and `ProjectConfigDomain.md` (008) with the additive `sdd` field + provenance; changelog entries
- [x] **T-23** Implementation changelog entry via `relic write`

### Phase 6 — Verification

- [x] **T-24** `claude plugin validate ./plugin --strict` green (if CLI available); structural checks otherwise
- [x] **T-25** E2E: fresh temp project — `add-engine claude` writes settings only; `upgrade --clean` removes legacy copies; `relic context` reports `sdd`
- [x] **T-26** Full suite + typecheck green; `relic validate` clean; check off tasks; update 011 status

---

## Notes

- Phase 2 blocks 3 (skills live in the plugin tree); Phase 4 is independent of 2–3; Phase 5 last.
- `plugin/commands/` generated files are committed; never hand-edited (build asserts freshness).
- Spec HTML files are frozen (D-9) — only `relic scaffold`'s built-in sync runs, no deep passes in this spec.
