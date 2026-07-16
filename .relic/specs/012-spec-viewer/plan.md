# Plan: Spec Viewer — Server-Rendered Views over MCP

**Spec ID:** 012-spec-viewer
**Status:** ready
**Planned:** 2026-07-02

---

## Architecture Overview

Three moving parts, one data source:

```
.relic/  (backend — files, the only source of truth)
   ▲ read-only, per request
relic serve  (HTTP, localhost:<port>)         relic mcp  (stdio)
   ├── embedded React bundle (shell + assets)     └── tools: view_spec / view_fix /
   └── JSON API: /api/health /api/project             list_views → ensure serve
       /api/spec/<id> /api/fix/<id>                   running → return URL
```

- **`packages/viewer/`** — full React app scaffolded with the Vite react template
  (`bun create vite viewer --template react --no-interactive`). Development:
  `vite dev` with HMR, proxying `/api` to a running `relic serve` instance.
  Production: `vite build` → `dist/` (index.html + hashed JS/CSS assets); a new embed
  step (`scripts/embed-viewer.ts`, mirroring the existing embed scripts) bakes the
  whole `dist/` tree into `packages/core/src/generated/viewer-assets.ts` so both
  distribution channels (Node bundle, compiled binaries) carry it. Vite is a
  devDependency of `packages/viewer` only — never part of the shipped CLI.
- **Fragment pipeline** — one tolerant parser in `@relic/core`
  (`core/fragment.ts`): parses `<relic-body>` fragments into a typed node tree; feeds
  BOTH the JSON API (viewer renders the tree) and `relic validate` (lint). Malformed
  input degrades to warning nodes, never throws (NFR-3). The viewer maps node types →
  React components, each wrapped in an error boundary (FR-3).
- **Derived components** — computed server-side in the API layer from the same helpers
  the CLI already has (tasks parsing, artifacts.json, spec headers, changelog filter):
  the fragment tree's derived nodes are enriched with data before serialisation.
- **Server** — Bun/Node-compatible HTTP (no framework dependency; hand-rolled router
  is ~100 lines): static assets from the embedded map, JSON API, health. Lifecycle
  state in gitignored `.relic/viewer.json`; reuse-or-increment port logic per FR-10/11.
- **MCP** — stdio JSON-RPC per current MCP spec (Phase 1 pins the protocol details;
  prefer zero-dependency hand implementation of the 3-tool surface over pulling an SDK
  if the surface stays this small — decide in Phase 1 with the facts).

## Implementation Phases

### Phase 1 — Pin platform facts (OQ-1)
1. Current MCP spec: stdio framing, initialize/tools handshake, tool result shapes;
   plugin `.mcp.json` schema. Record in `ViewerContract.md`; decide SDK vs minimal
   hand-rolled implementation.
2. Bun asset-embedding constraints for both channels (node bundle + compiled targets).

### Phase 2 — Fragment pipeline (blocks everything user-visible)
1. `core/fragment.ts`: tolerant parser + typed tree + lint results; tag grammar per
   `ViewerContract.md` (authored: section/callout/flow/chart/table/chip/status;
   derived: spec-meta/tasks/artifacts/changelog).
2. `relic validate`: fragment lint wired in (FR-4); fixtures incl. legacy full
   documents and malformed attrs.
3. New fragment template for scaffold; `templates/base.html` retired from scaffold
   path.

### Phase 3 — Viewer package
1. Scaffold: `bun create vite viewer --template react --no-interactive` inside
   `packages/`; align package.json name (`@relic/viewer`), add React Router, wire the
   `/api` dev proxy in `vite.config`.
2. App: shell, router (dashboard `/`, `/spec/:id`, `/fix/:id`, `/docs`), theme;
   component per tag with error boundaries; markdown renderer for spec/plan/tasks tabs.
3. Build + embed: `vite build` → `scripts/embed-viewer.ts` embeds `dist/` (all hashed
   assets, correct content types); wired into the build chain
   (`build:viewer` → embed) and CI freshness. `relic serve` static handler + SPA
   fallback consume the embedded map.

### Phase 4 — Server + CLI
1. `relic serve`: router, embedded assets, JSON API reading `.relic` live, health,
   port resolution (`viewer.port` in project-config + auto-increment), `viewer.json`
   lifecycle file, `.relic/.gitignore` addition.
2. `relic context`: additive `viewer` field (OQ-2 — resolved yes at plan time:
   `{ running, port, url }`); ContextResultContract amendment (cross-spec, changelog).

### Phase 5 — MCP + plugin
1. `relic mcp` stdio server: 3 tools, ensure-running logic (health check → spawn
   detached → poll ready).
2. Plugin `.mcp.json` + `ClaudePluginContract.md` amendment; `plugin.json` untouched
   (mcp config is a component file).

### Phase 6 — Migration + re-teaching
1. `relic viewer-migrate`: legacy extraction (reuse html-rebase extractor) → tag
   mapping → `<relic-body>` fragment; best-effort raw sections + validation warnings
   for unmappable content (OQ-3). Run for this repo's four spec HTMLs + two fix HTMLs.
2. `relic upgrade`: run migration, remove `.relic/base.html` (reported); `html-sync`
   retirement stub (FR-16); scaffold html path swapped to fragments.
3. Prompts: rewrite `html-mode` snippet for fragments; add `viewer-components`
   snippet; regenerate embeds + plugin.
4. Knowledge layer: `ViewerContract.md` final; `HtmlComponentContract.md` superseded
   pointer (008-owned — changelog); `ProjectConfigDomain.md` `viewer.port`;
   `ClaudePluginContract` mcp section; changelog entries.

### Phase 7 — Verification
1. Unit: fragment parser/lint, port resolution, API shapes, migration fixtures.
2. E2E: temp project → scaffold → fragment created → `relic serve` → curl API + HTML
   shell → migrate a legacy file → validate lint clean; MCP handshake smoke over
   stdio (initialize → tools/list → view_spec → URL).
3. Browser check of `/`, `/spec/<id>`, `/fix/<id>`, `/docs` (manual/owner — headless
   env limitation noted).

## File Changes

| File | Action | Notes |
|------|--------|-------|
| `packages/viewer/**` | create | React app: shell, router, components, styles, docs route |
| `scripts/embed-viewer.ts` | create | bundle + bake assets; CI freshness |
| `packages/core/src/core/fragment.ts` | create | tolerant parser + lint (one impl, two consumers) |
| `packages/core/src/commands/serve.ts` | create | HTTP server + API + lifecycle |
| `packages/core/src/commands/mcp.ts` | create | stdio MCP, 3 tools |
| `packages/core/src/commands/viewer-migrate.ts` | create | legacy → fragment |
| `packages/core/src/commands/html-sync.ts` | modify | retirement stub |
| `packages/core/src/commands/validate.ts` | modify | fragment lint |
| `packages/core/src/commands/context.ts` | modify | `viewer` field |
| `packages/core/src/commands/scaffold.ts` | modify | fragment template path |
| `packages/core/src/commands/upgrade.ts` | modify | migrate + base.html removal |
| `packages/utility/src/project-config.ts` | modify | `viewer.port` |
| `packages/cli-node/src/bin.ts` / `bin.debug.ts` | modify | serve/mcp/viewer-migrate |
| `templates/fragment.html` | create | minimal `<relic-body>` scaffold template |
| `templates/snippets/html-mode.md` | rewrite | fragment authoring rules |
| `templates/snippets/viewer-components.md` | create | tag reference |
| `plugin/.mcp.json` | create | MCP wiring |
| `templates/base.html` | retire | kept one release for migration reference, then removed |

## Intersection Notes

- **`HtmlComponentContract.md` (008-owned):** superseded by `ViewerContract.md` —
  historical-pointer edit + changelog (same pattern as SkillExtractionContract).
- **`ProjectConfigDomain.md` (008) / `ContextResultContract.md` (003):** additive
  `viewer.port` / `viewer` fields — changelog at plan + implementation time.
- **`ClaudePluginContract.md` (011, ours-adjacent):** gains the `.mcp.json` component
  section.
- **Spec 008's surface** (scaffold/mode/html-sync) is heavily reshaped — 008 is
  implemented and closed; the changelog records the supersession chain.
- **Specs 010/011 prompts/plugin:** snippet rewrite + `.mcp.json` are additive.

## Changelog Reference

- Plan-time entry: 012 planned; cross-spec notices (HtmlComponentContract supersession,
  ProjectConfigDomain viewer.port, ContextResultContract viewer field).
- Implementation-time entries for each cross-spec amendment.
