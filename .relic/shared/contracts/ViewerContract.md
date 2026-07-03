# ViewerContract

**Type:** contract
**Owned by:** 012-spec-viewer
**Confidence:** high — implemented and verified 2026-07-03 (MCP stdio facts from modelcontextprotocol.io; API/tag grammar as shipped)

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
`<relic-flow>` (mermaid-style, unchanged syntax; raw-text content) ·
`<relic-chart type=bar|pie|line labels data title>` · `<relic-table headers rows>`
(JSON attrs; cells render a safe inline subset for legacy chip/status content) ·
`<relic-chip color?>` · `<relic-status value>` · `<relic-progress>` (legacy-compat) ·
prose subset `p ul ol li code pre strong em b i a br hr div span h1–h4 blockquote
table thead tbody tr th td` (class attribute passes through on prose tags).

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
- Routes: `/` dashboard · `/spec/<id>` · `/fix/<id>` · `/docs` (tag reference);
  unknown non-API GETs fall back to the app shell (client routing).
- JSON API (implemented shapes — `packages/viewer/src/api.ts` mirrors them):
  - `/api/health` → `{ relic: true, project: <absolute project dir>, version }`
    (identity check for same-project reuse)
  - `/api/project` → `{ project{name,path}, mode, specs[{id,title,status,tasks{done,total},has_html}], fixes[{id,format}], validate{valid,errors,warnings} }`
  - `/api/spec/<id>` → `{ id, title, status, fragment: FragmentNode[], lints, files{spec,plan,tasks: string|null}, derived{meta,tasks{done,total,phases},artifacts,external_reads,changelog} }`
  - `/api/fix/<id>` → `{ id, format: html|md, fragment|null, lints, markdown|null }`

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

## MCP (implemented — facts pinned 2026-07-02 from modelcontextprotocol.io)

`relic mcp` — stdio transport: newline-delimited JSON-RPC 2.0, UTF-8, no embedded
newlines; stdout carries only MCP messages, stderr is free for logs. Hand-rolled,
zero-dependency (T-2). Handshake: `initialize` (echoes the client's
`protocolVersion`, fallback `2025-06-18`; capabilities `{tools:{}}`; serverInfo
`relic`) → `notifications/initialized` → `tools/list` / `tools/call`. In-flight tool
calls drain before exit on stdin close.

Tools only (D-4): `view_spec(spec_id)` / `view_fix(fix_id)` / `list_views()` — each
finds a healthy same-project server on ports base..base+19 or spawns `relic serve`
detached and polls up to 6s, then returns the URL (+title/status context).
Shipped via `plugin/.mcp.json`: `{"mcpServers":{"relic":{"command":"relic","args":["mcp"]}}}`.

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
