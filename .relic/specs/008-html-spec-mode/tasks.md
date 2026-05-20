# Tasks: HTML Spec Mode

**Spec ID:** 008-html-spec-mode
**Generated from plan:** 2026-05-19

---

## Tasks

### Phase 1 — Config infrastructure: `project-config.ts`

- [x] **T-01** Create `packages/utility/src/project-config.ts` — types `ProjectConfig = { engines: string[]; mode: "md" | "html" }`, functions `readProjectConfig`, `writeProjectConfig`, `readEngines`, `writeEngines`, `readMode`, `writeMode`; include silent auto-migration from `engines.json` → `config.json` in `readProjectConfig`
- [x] **T-02** Update `packages/utility/src/index.ts` — add exports for all six functions from `project-config.ts`; remove `readEnginesRegistry` / `writeEnginesRegistry` exports
- [x] **T-03** Update `packages/core/src/commands/init.ts` — replace `writeEnginesRegistry` import and call with `writeEngines`; write `config.json` shape `{ engines, mode: "md" }` not `engines.json`; update log line
- [x] **T-04** Update `packages/core/src/commands/upgrade.ts` — replace `readEnginesRegistry` import and call with `readEngines`
- [x] **T-04b** Update `packages/core/src/__tests__/upgrade.test.ts` — replace any `engines.json` fixture references with `config.json` shape `{ engines, mode }`; update `readEnginesRegistry` import/mock to `readEngines`
- [x] **T-05** Update `packages/cli-node/src/bin.ts` — replace `readEnginesRegistry` / `writeEnginesRegistry` imports and calls with `readEngines` / `writeEngines`
- [x] **T-06** Update `packages/cli-node/src/bin.debug.ts` — same as T-05
- [x] **T-07** Create `packages/utility/src/__tests__/project-config.test.ts` — cover: `readProjectConfig` with no files (default), with `config.json`, with `engines.json` only (migration path — reads array, writes `config.json`, removes `engines.json`); `writeProjectConfig` round-trip; `readEngines` / `writeEngines`; `readMode` / `writeMode`; migration is idempotent
- [x] **T-08** Delete `packages/utility/src/engines-registry.ts` — superseded by `project-config.ts` (do after T-02 and T-07 pass)
- [x] **T-09** Delete `packages/utility/src/__tests__/engines-registry.test.ts` — replaced by T-07

### Phase 2 — Extend `relic context` with `mode`

- [x] **T-10** Update `packages/core/src/commands/context.ts` — add `mode: "md" | "html"` to `ContextResult` interface; import `readMode` from `@relic/utility`; populate `result.mode = readMode(relicDir)`; add `mode` to `--text` output
- [x] **T-11** Amend `shared/contracts/ContextResultContract.md` — add `mode` field to the contract shape; run `relic write --changelog` with entry `"008-html-spec-mode: amend ContextResultContract.md — add mode field"`

### Phase 3 — New `relic mode` command

- [x] **T-12** Create `packages/core/src/commands/mode.ts` — `ModeOptions { value?: "md" | "html"; text?: boolean; relicDir?: string }`; no argument → print `{ "mode": "..." }` JSON; with argument → validate (`"md"` | `"html"`, reject others with clear error) → call `writeMode`; when switching to `html` → check for `.relic/base.html`, write from `TEMPLATES["base.html"]` if absent; `--text` flag for human-readable output
- [x] **T-13** Update `packages/core/src/index.ts` — export `runMode` and `ModeOptions`
- [x] **T-14** Register `relic mode [value]` in `packages/cli-node/src/bin.ts` with `--text` flag
- [x] **T-15** Register `relic mode [value]` in `packages/cli-node/src/bin.debug.ts` with `--text` flag

### Phase 4 — `templates/base.html` and embed pipeline

- [x] **T-16** Create `templates/base.html` — embed Tailwind CSS standalone (minified, in `<style>` block); embed Mermaid.js (minified, inline `<script>`); implement custom elements `<relic-chart>` (bar/pie/line), `<relic-flow>` (Mermaid), `<relic-status>` (pending/in-progress/done/risk badge), `<relic-table>` (JSON data table), `<relic-callout>` (info/warn/risk), `<relic-progress>` (numeric bar); include `<!-- RELIC COMPONENTS -->` inventory comment at top of `<body>` documenting each component's invocation syntax; include `{{SPEC_ID}}` and `{{TITLE}}` template variables in `<title>` and page heading
- [x] **T-17** Update `scripts/embed-templates.ts` — add `|| entry.endsWith(".html")` to the `collectFiles` filter alongside `.md` and `.sh`

### Phase 5 — Scaffold HTML in `scaffold.ts`

- [x] **T-18** Update `packages/core/src/commands/scaffold.ts` — after creating the four standard spec files, if `readMode(relicDir) === "html"`: compute `join(specDir, `${specId}.html`)`, skip if file already exists, substitute `{{SPEC_ID}}` and `{{TITLE}}` in `TEMPLATES["base.html"]` via `applyTemplate`, write result, push `"${specId}.html"` to `filesCreated`

### Phase 6 — Prompt template HTML steps

- [x] **T-19** Update `templates/prompts/specify.md` — append conditional HTML step section: run `relic context`; if `mode` is `"html"`: read `base.html` component inventory, read `<spec-id>.html`, update it with enriched content from this session using `<relic-*>` components; if `mode` is `"md"`: skip
- [x] **T-20** Update `templates/prompts/clarify.md` — same HTML step pattern as T-19
- [x] **T-21** Update `templates/prompts/plan.md` — same HTML step pattern as T-19
- [x] **T-22** Update `templates/prompts/tasks.md` — same HTML step pattern as T-19
- [x] **T-23** Update `templates/prompts/implement.md` — same HTML step pattern as T-19
- [x] **T-24** Update `templates/prompts/fix.md` — HTML step: if `mode` is `"html"`, the fix document is `<fix-id>.html` (not `.md`) in `.relic/fixes/`; create it with all `FixDocumentContract` fields rendered via `base.html` components (relic-callout for root cause, relic-flow for proposed changes, relic-table for affected files, relic-status for status badge); if `mode` is `"md"`: create `<fix-id>.md` as before
- [x] **T-25** Update `templates/prompts/solve.md` — HTML step: if `mode` is `"html"`, update `<fix-id>.html`'s status badge to `solved` and mark proposed changes as applied; if `mode` is `"md"`: update `<fix-id>.md` as before

### Phase 7 — Cross-spec mutation: `UpgradeDomain.md`

- [x] **T-26** Amend `shared/domains/UpgradeDomain.md` — replace all references to `engines.json` with `config.json`; replace `engines-registry.ts` with `project-config.ts`; note that `config.json` shape is `{ engines, mode }` and that `readMode` / `readEngines` are the access functions; run `relic write --changelog` with entry `"008-html-spec-mode: amend UpgradeDomain.md — rename engines.json and engines-registry.ts"`

### Build & verify

- [x] **T-27** Run `bun run build:templates` — rebuilds `packages/core/src/generated/templates.ts` with `base.html` now included alongside the `.md` files; verify `TEMPLATES["base.html"]` is present in the generated output
- [x] **T-28** Run `bun run test` across all packages — utility (new `project-config.test.ts`), core (existing tests still pass after `engines-registry` removal)
- [x] **T-29** Run `relic validate` — confirm `valid: true` with no unregistered files or manifest errors

---

## Notes

**Completed overlaps from other specs (no active conflicts):**
- Spec 004 (complete): created `engines-registry.ts` (T-04), updated `utility/src/index.ts` (T-05), `init.ts` (T-06), `bin.ts` / `bin.debug.ts` (T-07, T-08) — all now being superseded by this spec
- Spec 003 (complete): modified `scaffold.ts` and `context.ts` — this spec adds new branches to both
- Spec 005 (complete): modified `upgrade.ts` — this spec updates its import from `readEnginesRegistry` → `readEngines`
- Spec 006 (complete): modified all 7 prompt templates — this spec appends HTML step sections to each

**Cross-spec mutations (changelog entries required at T-11 and T-26):**
- `ContextResultContract.md` (owned by spec 003) — additive-only change: new `mode` field
- `UpgradeDomain.md` (owned by spec 004) — rename-only change: no behaviour change

**Dependency ordering:**
- T-02 depends on T-01 (index.ts exports from project-config.ts)
- T-03 through T-06 depend on T-02 (callers need new exports available)
- T-07 can run in parallel with T-03–T-06
- T-08 and T-09 must be last in Phase 1 (after tests pass)
- T-12 depends on T-01 (mode.ts uses readMode/writeMode)
- T-13 depends on T-12
- T-14, T-15 depend on T-13
- T-17 should follow T-16 (embed pipeline needs the file to exist to verify)
- T-18 depends on T-01 and T-16 being done (uses readMode and TEMPLATES["base.html"])
- T-27 depends on T-16 and T-17 (build:templates must run after both)
- T-28 depends on T-27 (tests import from generated/templates.ts if mode.ts does)
