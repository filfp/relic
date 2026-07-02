# Tasks: Spec Viewer — Server-Rendered Views over MCP

**Spec ID:** 012-spec-viewer
**Generated from plan:** 2026-07-02

---

## Tasks

### Phase 1 — Pin platform facts (blocks 5; informs 4)

- [ ] **T-1** Pin current MCP facts against live docs: stdio framing, initialize/tools handshake, tool schema + result shapes, plugin `.mcp.json` schema; record in `ViewerContract.md` (OQ-1)
- [ ] **T-2** Decide MCP implementation: official SDK vs zero-dependency hand-rolled for the 3-tool surface (record decision + rationale in plan)
- [ ] **T-3** Verify Bun asset-embedding constraints for both channels (node bundle + compiled binaries): binary assets, content types, size limits

### Phase 2 — Fragment pipeline (blocks everything user-visible)

- [ ] **T-4** `core/fragment.ts`: tolerant parser → typed node tree per `ViewerContract` grammar (authored: section/callout/flow/chart/table/chip/status + prose; derived: spec-meta/tasks/artifacts/changelog); malformed input degrades to warning nodes, never throws (NFR-3)
- [ ] **T-5** Lint output from the same parser: unknown tags, malformed attributes, legacy full-document detection
- [ ] **T-6** `relic validate`: wire fragment lint per spec/fix (FR-4) + tests (fixtures: valid fragment, typo'd attrs, legacy document, empty)
- [ ] **T-7** `templates/fragment.html` (minimal `<relic-body>` scaffold) + `relic scaffold` creates fragments in html mode (replaces base.html copy path)
- [ ] **T-8** Unit tests: parser tree shapes, degradation nodes, derived-tag recognition

### Phase 3 — Viewer package

- [ ] **T-9** Scaffold `packages/viewer/` via `bun create vite viewer --template react --no-interactive`; align to `@relic/viewer`, add React Router, `/api` dev proxy in `vite.config` (D-8)
- [ ] **T-10** App shell: layout, header, dark/light theme (persisted), route skeleton (`/`, `/spec/:id`, `/fix/:id`, `/docs`)
- [ ] **T-11** Tag components with per-component error boundaries (FR-3): section, callout, flow (port mermaid-style renderer), chart, table, chip, status + inline-warning component
- [ ] **T-12** Derived components consuming API data: spec-meta, tasks (per-phase progress), artifacts (with links to owning specs — FR-7), changelog
- [ ] **T-13** Markdown renderer for spec/plan/tasks tabs (rendered live from API, GFM incl. task lists + tables)
- [ ] **T-14** Dashboard `/`: spec list with status/progress, fixes list, validate summary; `/docs` tag-reference route
- [ ] **T-15** `scripts/embed-viewer.ts`: `vite build` → embed `dist/` tree into `packages/core/src/generated/viewer-assets.ts`; wire `build:viewer` into the build chain + CI freshness

### Phase 4 — Server + CLI

- [ ] **T-16** `commands/serve.ts`: HTTP router (GET-only), embedded static assets at `/` + SPA fallback (D-9), localhost bind
- [ ] **T-17** JSON API: `/api/health` (project identity), `/api/project` (specs+fixes+validate summary), `/api/spec/<id>` (fragment tree + derived data + md files), `/api/fix/<id>`; shapes recorded in `ViewerContract`
- [ ] **T-18** Port + lifecycle: `viewer.port` in project-config (default 4747), auto-increment on foreign conflict, same-project reuse via health check, `.relic/viewer.json` (gitignored) — FR-10/11
- [ ] **T-19** `relic context`: additive `viewer` field `{ running, port, url }` (OQ-2) + `ContextResultContract` amendment + changelog
- [ ] **T-20** Register `serve` in `bin.ts`/`bin.debug.ts`; tests (port resolution, API shapes, health identity, read-only guarantee)

### Phase 5 — MCP + plugin

- [ ] **T-21** `commands/mcp.ts`: stdio MCP server per T-1 facts — `view_spec` / `view_fix` / `list_views`, ensure-running (health → spawn detached → poll), URL + context results
- [ ] **T-22** `plugin/.mcp.json` wiring `relic mcp`; `ClaudePluginContract` amendment; bin registration; MCP handshake smoke test over stdio

### Phase 6 — Migration + re-teaching

- [ ] **T-23** `commands/viewer-migrate.ts`: legacy full-document → fragment (reuse html-rebase extractor; mechanical tag mapping; best-effort raw sections + lint warnings for the rest — OQ-3)
- [ ] **T-24** Run migration on this repo: 5 spec HTMLs + 2 fix HTMLs converted; validate clean
- [ ] **T-25** `relic upgrade`: run migration + remove `.relic/base.html` (reported); `html-sync` retirement stub (FR-16)
- [ ] **T-26** Rewrite `templates/snippets/html-mode.md` for fragment authoring; add `templates/snippets/viewer-components.md`; regenerate embeds + plugin
- [ ] **T-27** Knowledge layer: `ViewerContract` finalised (API shapes, MCP facts); `HtmlComponentContract` supersession completed; `ProjectConfigDomain` `viewer.port`; changelog entries for all cross-spec amendments

### Phase 7 — Verification

- [ ] **T-28** E2E: temp project → scaffold (fragment created) → `relic serve` → curl `/api/*` + `/` shell + SPA fallback → migrate a legacy file → validate lint clean
- [ ] **T-29** MCP smoke: initialize → tools/list → `view_spec` returns working URL against the running server
- [ ] **T-30** Full suite + typecheck green; `bun test` root green; plugin validate --strict; owner browser pass of `/`, `/spec/<id>`, `/fix/<id>`, `/docs` (headless env can't render — flagged for owner)

---

## Notes

- Ordering: Phase 1 → (2 → 3 → 4) → 5; Phase 6 needs 2+4; Phase 7 last. Phases 3 and 4
  can interleave once the API shapes in `ViewerContract` are drafted.
- Commits are cut along phase boundaries on the cumulative PR (owner-approved delivery
  as one phase, splittable later).
- `packages/core/src/generated/viewer-assets.ts` is gitignored like the other embeds;
  `plugin/.mcp.json` is committed.
- Spec HTML fragments for 012 itself: this spec's own HTML is migrated in T-24 with
  the rest — no special-casing.
