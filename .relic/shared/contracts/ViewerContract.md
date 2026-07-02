# ViewerContract

**Type:** contract
**Owned by:** 012-spec-viewer
**Confidence:** medium — MCP protocol details and final tag grammar are pinned in implementation Phase 1/2

## Description

The contract for the Relic spec viewer: the authored fragment format, the derived
component set, the local server's JSON API and lifecycle model, and the MCP tool
surface. Supersedes `HtmlComponentContract.md` (008) once spec 012 ships.

## Fragment Format

A spec/fix HTML file is a fragment — one `<relic-body>` root, semantic tags only, no
chrome of any kind:

```html
<relic-body>
  <relic-spec-meta/>
  <relic-section title="Overview">
    <p>Narrative synthesis…</p>
    <relic-callout type="info">Key decision…</relic-callout>
    <relic-flow>graph LR
      A[config] --> B[server]
    </relic-flow>
  </relic-section>
  <relic-tasks/>
  <relic-artifacts/>
</relic-body>
```

### Derived tags (self-closing — the server computes all content from the real files)

| Tag | Source |
|---|---|
| `<relic-spec-meta/>` | spec.md header (id, title, status, dates) |
| `<relic-tasks/>` | tasks.md (per-phase and total progress, task table) |
| `<relic-artifacts/>` | artifacts.json (owns/reads/external_reads + existence) |
| `<relic-changelog/>` | changelog.md filtered to this spec |

### Authored tags (synthesis only — the smallest grammar that still expresses meaning)

`<relic-section title>` · `<relic-callout type=info|warn|risk|success>` ·
`<relic-flow>` (mermaid-style, unchanged syntax) · `<relic-chart type=bar|pie|line
labels data title>` · `<relic-table headers rows>` · `<relic-chip color?>` ·
`<relic-status value>` · plain `<p>/<ul>/<code>` prose inside sections.

### Guarantees

- Unknown tags / malformed attributes render as inline warnings (per-component error
  boundaries) — never a broken page.
- One tolerant parser (`core/fragment.ts`) feeds both the server API and
  `relic validate` lint.
- The LLM never writes data a derived tag can supply.

## Server

- `relic serve [--port]` — localhost-only, **read-only** (GET), per-project.
- Port: `--port` → `config.json` `viewer.port` → default `4747`; healthy same-project
  instance is reused, otherwise auto-increment.
- Lifecycle: `.relic/viewer.json` (gitignored) `{ port, pid, started_at }`;
  `/api/health` returns `{ project, version }` for identity checks.
- Routes: `/` dashboard · `/spec/<id>` · `/fix/<id>` · `/docs` (tag reference).
- JSON API: `/api/health` · `/api/project` · `/api/spec/<id>` · `/api/fix/<id>`
  (exact shapes recorded here during implementation).

## Build & Toolchain (D-8/D-9)

- `packages/viewer/` — Vite react template scaffold (full React, React Router, real
  CSS). Vite = dev/build only: `vite dev` (HMR, `/api` proxied to `relic serve`);
  `vite build` → `dist/` → `scripts/embed-viewer.ts` →
  `packages/core/src/generated/viewer-assets.ts` (gitignored, rebuilt by the build
  chain; CI-checked).
- `relic serve` runtime serving: `/` = embedded built app (index + hashed assets),
  `/api/*` = JSON, SPA fallback for unknown non-API GETs (client-routed deep links and
  future pages are additive).
- Vite never ships to users; the CLI stays a single self-contained artifact.

## MCP

`relic mcp` (stdio), tools only: `view_spec(spec_id)` / `view_fix(fix_id)` /
`list_views()` — each ensures the server is running and returns the URL + minimal
context. Shipped via the plugin's `.mcp.json`. Protocol details pinned at
implementation (OQ-1).

## Migration

- `relic viewer-migrate` converts legacy full-document HTML to fragments (content
  extraction reuses the html-rebase extractor); unmappable content is preserved
  best-effort inside a section and flagged by validate.
- `relic html-sync` retires (no chrome exists to sync); `relic upgrade` migrates and
  removes `.relic/base.html`.

## Invariants

- The server never writes to `.relic/` — the CLI is the only writer.
- Fragments are committed, diffable text files; the viewer is stateless per request.
- No network access at runtime beyond localhost serving; assets fully embedded.
