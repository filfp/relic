# Plan: HTML Spec Mode

**Spec ID:** 008-html-spec-mode
**Status:** draft

---

## Architecture Overview

The implementation has three independent concerns that are layered on top of each other:

**1. Config infrastructure** — `engines-registry.ts` is renamed to `project-config.ts` and extended from a bare JSON array to a keyed `{ engines, mode }` object. All callers are updated. Auto-migration from `engines.json` → `config.json` happens on first read. The `mode` field is surfaced in `relic context` output so AI workflow commands can check it without reading the config file directly.

**2. HTML scaffold** — `relic scaffold` gains a mode-aware branch: when mode is `html`, it creates `<spec-id>.html` from the embedded `base.html` template if the file does not already exist. A new `relic mode` CLI command switches the mode and, for `html`, also scaffolds `.relic/base.html` from the same template. `templates/base.html` is a self-contained component library with embedded Tailwind CSS and Mermaid.js — no runtime CDN dependency. `embed-templates.ts` is extended to pick up `.html` files alongside `.md`.

**3. Prompt template HTML steps** — all seven workflow prompt files (`specify`, `clarify`, `plan`, `tasks`, `implement`, `fix`, `solve`) gain a conditional final section. The LLM checks `mode` from `relic context` and, if `html`, reads the relevant HTML file, updates it using `base.html` components, and writes it back. For fix/solve, when mode is `html` the HTML file replaces the `.md` entirely. No TypeScript business logic is added for the HTML content — this is purely prompt-driven (Constitution Principle II).

The three concerns are independent at the code level: config infrastructure has no dependency on the scaffold or prompt changes; the scaffold depends only on the config read; the prompt changes are pure text edits.

---

## Implementation Phases

### Phase 1 — Config infrastructure: `project-config.ts`

1. Create `packages/utility/src/project-config.ts`:
   - Type `ProjectConfig = { engines: string[]; mode: "md" | "html" }`.
   - `readProjectConfig(relicDir)`: reads `config.json`; if absent but `engines.json` exists, migrates silently (reads array → writes `config.json` with `{ engines, mode: "md" }` → removes `engines.json`); if neither exists, returns default `{ engines: [], mode: "md" }`.
   - `writeProjectConfig(relicDir, config)`: writes `config.json`.
   - Convenience helpers: `readEngines(relicDir)`, `writeEngines(relicDir, engines[])`, `readMode(relicDir)`, `writeMode(relicDir, mode)`.
2. Update `packages/utility/src/index.ts`: export all new functions from `project-config.ts`; remove `readEnginesRegistry` / `writeEnginesRegistry` exports.
3. Delete `packages/utility/src/engines-registry.ts` (after all callers are updated in step 4).
4. Update all callers:
   - `packages/core/src/commands/init.ts` — `writeEnginesRegistry` → `writeEngines`; write `config.json` not `engines.json`; update log line.
   - `packages/core/src/commands/upgrade.ts` — `readEnginesRegistry` → `readEngines`.
   - `packages/cli-node/src/bin.ts` — update import (if it imports directly).
   - `packages/cli-node/src/bin.debug.ts` — update import.
5. Rename `packages/utility/src/__tests__/engines-registry.test.ts` → `packages/utility/src/__tests__/project-config.test.ts`; update tests for the new shape and migration logic.

### Phase 2 — Extend `relic context` with `mode`

1. In `packages/core/src/commands/context.ts`:
   - Import `readMode` from `@relic/utility`.
   - Add `mode: "md" | "html"` to the `ContextResult` interface.
   - Populate `result.mode` by calling `readMode(relicDir)`.
   - Add `mode` to the `--text` output.
2. This amends `ContextResultContract.md` (owned by spec 003) — write a changelog entry at implement time.

### Phase 3 — New `relic mode` command

1. Create `packages/core/src/commands/mode.ts`:
   - `ModeOptions { value?: "md" | "html"; text?: boolean; relicDir?: string }`.
   - No argument: read and print `{ "mode": "md" }` (JSON default).
   - Argument: validate (`"md"` | `"html"`, reject anything else with clear error); call `writeMode(relicDir, value)`.
   - When switching to `html`: check for `.relic/base.html`; if absent, write it from `TEMPLATES["base.html"]`.
   - `--text` flag: human-readable single line.
2. Export `runMode` + `ModeOptions` from `packages/core/src/index.ts`.
3. Register `relic mode [value]` in `packages/cli-node/src/bin.ts` (production binary).
4. Register same in `packages/cli-node/src/bin.debug.ts`.

### Phase 4 — `templates/base.html` and embed pipeline

1. Create `templates/base.html`:
   - Embed Tailwind CSS standalone (full minified CSS inline in a `<style>` block).
   - Embed Mermaid.js (minified, inline `<script>` block) for `<relic-flow>`.
   - Implement custom elements: `<relic-chart>`, `<relic-flow>`, `<relic-status>`, `<relic-table>`, `<relic-callout>`, `<relic-progress>` — each as a minimal self-contained web component.
   - Include `<!-- RELIC COMPONENTS -->` inventory comment block at the top of the `<body>` documenting every component's invocation syntax.
   - Template variables `{{SPEC_ID}}` and `{{TITLE}}` for substitution when creating spec/fix HTML shells.
2. Update `scripts/embed-templates.ts`:
   - In `collectFiles`, change the filter from `.md` | `.sh` to also include `.html`.
   - No other changes needed — the file is already picked up at the key `"base.html"`.

### Phase 5 — Scaffold HTML in `scaffold.ts`

1. In `packages/core/src/commands/scaffold.ts`:
   - Import `readMode` from `@relic/utility`.
   - After creating the four standard spec files, if `readMode(relicDir) === "html"`:
     - Compute target path: `join(specDir, `${specId}.html`)`.
     - If file does not exist: substitute `{{SPEC_ID}}` and `{{TITLE}}` in `TEMPLATES["base.html"]` using `applyTemplate`; write result; push `"${specId}.html"` to `filesCreated`.
2. `ScaffoldResultContract.md` (spec 008 owns) is already updated — no changelog entry needed.

### Phase 6 — Prompt template HTML steps

Add a conditional "HTML step" section to the end of each of the seven prompt files. The section structure is the same for all spec commands:

```markdown
## HTML Step (conditional)

Run:
```bash
relic context
```

If `mode` is `"html"`:

1. Read `.relic/base.html` and note the `<!-- RELIC COMPONENTS -->` inventory.
2. Read `<spec-id>.html` (in the spec directory).
3. Update the relevant sections with enriched content based on the work done in this session:
   - Use `<relic-chart>`, `<relic-flow>`, `<relic-status>`, and other components for visualisation.
   - Do not mechanically transcribe the Markdown — synthesise and enrich.
4. Write the updated `<spec-id>.html` back.

If `mode` is `"md"`, skip this step entirely.
```

The fix and solve commands follow the same pattern but:
- The HTML file path is `<fix-id>.html` in `.relic/fixes/` (not the spec dir).
- When mode is `html`, `fix.md` creates `<fix-id>.html` **instead of** `<fix-id>.md`.
- `solve.md` updates the HTML file's Status section to `solved` and marks changes as applied.

Files to update:
- `templates/prompts/specify.md`
- `templates/prompts/clarify.md`
- `templates/prompts/plan.md`
- `templates/prompts/tasks.md`
- `templates/prompts/implement.md`
- `templates/prompts/fix.md`
- `templates/prompts/solve.md`

### Phase 7 — Update `UpgradeDomain.md` (cross-spec mutation)

Amend `shared/domains/UpgradeDomain.md` (owned by spec 004):
- Replace all references to `engines.json` → `config.json`.
- Replace `engines-registry.ts` → `project-config.ts`.
- Note that `config.json` shape is `{ engines, mode }` and that `readMode` / `readEngines` are the access functions.

Write a changelog entry for this cross-spec mutation.

---

## File Changes

| File | Action | Notes |
|---|---|---|
| `packages/utility/src/project-config.ts` | **create** | Replaces `engines-registry.ts`; full config CRUD + migration |
| `packages/utility/src/engines-registry.ts` | **delete** | Superseded by `project-config.ts` |
| `packages/utility/src/index.ts` | **modify** | Re-export from `project-config.ts`; remove old exports |
| `packages/utility/src/__tests__/project-config.test.ts` | **create** | Renamed from `engines-registry.test.ts`; adds migration + mode tests |
| `packages/utility/src/__tests__/engines-registry.test.ts` | **delete** | Replaced by `project-config.test.ts` |
| `packages/core/src/commands/init.ts` | **modify** | `writeEnginesRegistry` → `writeEngines`; write `config.json` |
| `packages/core/src/commands/upgrade.ts` | **modify** | `readEnginesRegistry` → `readEngines` |
| `packages/core/src/commands/context.ts` | **modify** | Add `mode` field to `ContextResult`; read via `readMode` |
| `packages/core/src/commands/mode.ts` | **create** | New `relic mode` command |
| `packages/core/src/commands/scaffold.ts` | **modify** | Add HTML file creation when mode=html |
| `packages/core/src/__tests__/upgrade.test.ts` | **modify** | Update for `config.json` shape |
| `packages/core/src/index.ts` | **modify** | Export `runMode`, `ModeOptions` |
| `packages/cli-node/src/bin.ts` | **modify** | Register `relic mode` command |
| `packages/cli-node/src/bin.debug.ts` | **modify** | Register `relic mode` command |
| `templates/base.html` | **create** | Self-contained component library (Tailwind + Mermaid inline) |
| `scripts/embed-templates.ts` | **modify** | Add `.html` to file filter |
| `templates/prompts/specify.md` | **modify** | Add HTML step section |
| `templates/prompts/clarify.md` | **modify** | Add HTML step section |
| `templates/prompts/plan.md` | **modify** | Add HTML step section |
| `templates/prompts/tasks.md` | **modify** | Add HTML step section |
| `templates/prompts/implement.md` | **modify** | Add HTML step section |
| `templates/prompts/fix.md` | **modify** | Add HTML step section (HTML replaces MD when mode=html) |
| `templates/prompts/solve.md` | **modify** | Add HTML step section (update status in HTML file) |

---

## Shared Artifact Changes

| Artifact | Action | Notes |
|---|---|---|
| `shared/domains/ProjectConfigDomain.md` | already written (008 owns) | No further changes needed |
| `shared/contracts/HtmlComponentContract.md` | already written (008 owns) | No further changes needed |
| `shared/contracts/ScaffoldResultContract.md` | already updated (008 owns) | No further changes needed |
| `shared/domains/UpgradeDomain.md` | **amend** (004 owns — cross-spec) | Replace `engines.json` / `engines-registry.ts` refs; changelog required |
| `shared/contracts/ContextResultContract.md` | **amend** (003 owns — cross-spec) | Add `mode` field to shape; changelog required |

---

## Intersection Notes

**1. `ContextResultContract.md` — owned by spec 003**
Adding `mode` to the `relic context` JSON output amends this contract. Spec 008 touches `context.ts` but does not own the contract. Resolution: at implement time, amend `ContextResultContract.md` and write a changelog entry documenting the cross-spec mutation. This is additive-only (new field, not a breaking change) and does not affect any existing consumer of `relic context`.

**2. `UpgradeDomain.md` — owned by spec 004**
The rename of `engines-registry.ts` → `project-config.ts` and `engines.json` → `config.json` invalidates references in this artifact. Resolution: amend `UpgradeDomain.md` at implement time and write a changelog entry. No behaviour change — pure rename.

**3. `fix.md`, `solve.md`, `implement.md` — touched by specs 003, 005, 006**
These prompt files appear in the `touches_files` of three other specs. No ownership conflict — no spec owns prompt files. The HTML step is appended as a new conditional section at the end of each prompt, making the change strictly additive and non-breaking for existing mode=md usage.

**4. `init.ts`, `scaffold.ts`, `upgrade.ts`, `bin.ts`, `bin.debug.ts`**
All touched by multiple specs (003, 004, 005, 006). No ownership conflicts. Changes are additive: new `config.json` write in `init`, new HTML branch in `scaffold`, import rename in `upgrade`, new command registration in bins.

---

## Changelog Reference

*Changelog entries to be written during implement:*
- `008-html-spec-mode: amend ContextResultContract.md — add mode field` (cross-spec, 003 owns)
- `008-html-spec-mode: amend UpgradeDomain.md — rename engines.json and engines-registry.ts` (cross-spec, 004 owns)
