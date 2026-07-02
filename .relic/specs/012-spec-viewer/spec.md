# Spec: Spec Viewer — Server-Rendered Views over MCP

**Spec ID:** 012-spec-viewer
**Created:** 2026-07-02
**Status:** draft

---

## Overview

HTML mode today makes every spec a **standalone application**: ~800 lines of
machine-managed chrome per file, LLM-maintained content that breaks on a single
malformed attribute, embedded markdown copies with escaping rules, and `relic html-sync`
holding it all together. Phase 1 of the 1.0.0 roadmap made this survivable; it cannot
make it good — the architecture is wrong.

This spec replaces it with real infrastructure: **the `.relic/` folder is the backend;
an embedded frontend serves it over a local HTTP server; the agent delivers views
through MCP.**

- **Authored files shrink to semantic fragments.** A spec's HTML file becomes a
  `<relic-body>` fragment of semantic tags — no doctype, no chrome, no scripts, no
  styles. Fixes get the same format.
- **The frontend is a real application, embedded in the CLI.** React components, real
  stylesheet files, proper error boundaries — built once at build time, not copied into
  every project. A typo in an authored tag degrades one component into a visible inline
  warning; it can no longer blank a page.
- **Data components are server-derived.** Bare tags like `<relic-tasks/>` are filled by
  the server from the real files (`tasks.md`, `artifacts.json`, spec headers, the
  changelog). Progress numbers, statuses, and artifact lists can never be stale or
  mistyped, because the LLM never writes them.
- **The reader problem disappears.** `spec.md` / `plan.md` / `tasks.md` are rendered
  live from disk by a real markdown renderer — no embedded copies, no escaping rules,
  no sync.
- **MCP delivers the views.** When the user asks to see spec X, the agent calls an MCP
  tool that ensures the per-project server is running and returns
  `http://localhost:<port>/spec/012-spec-viewer`. The plugin ships the MCP config —
  zero setup.

Cross-spec navigation (specs index at `/`, links between specs, fix views) is native to
the server. Rendering the brain itself — the artifact/ownership graph — becomes a
future route on this same infrastructure (explicitly out of scope for v1, noted as the
follow-up).

---

## Requirements

### Functional — authored fragment format

- **FR-1:** In html mode, `specs/<id>/<spec-id>.html` is a **fragment**: a single
  `<relic-body>` root element containing only the tags defined by `ViewerContract.md`.
  No doctype, `<html>`, `<head>`, scripts, or styles. Same format for
  `fixes/<fix-id>.html`.
- **FR-2:** Two tag classes:
  - **Derived (server-filled, self-closing, no authored data):** `<relic-spec-meta/>`
    (id, title, status, dates from spec.md), `<relic-tasks/>` (per-phase progress
    computed from tasks.md), `<relic-artifacts/>` (owns/reads/external_reads with
    existence, from artifacts.json), `<relic-changelog/>` (entries filtered to this
    spec). The LLM writes the bare tag; the server computes the content at request
    time.
  - **Authored (synthesis):** `<relic-section title="">`, `<relic-callout type="">`,
    `<relic-flow>` (existing mermaid-style syntax), `<relic-chart type="" …>`,
    `<relic-table …>`, `<relic-chip>`, `<relic-status>`. Attribute grammar is
    simplified and documented in `ViewerContract.md`.
- **FR-3:** Unknown tags and malformed attributes never break a page: the viewer
  renders a visible inline warning component in their place (per-component error
  boundaries).
- **FR-4:** `relic validate` lints fragments: unknown tags, malformed attributes,
  non-fragment files (legacy full documents) are reported per spec/fix.

### Functional — viewer (frontend)

- **FR-5:** New package `packages/viewer/` (`@relic/viewer`): a **React** application
  (TSX + real CSS files) built by Bun at build time; the bundle is embedded into the
  CLI via the existing embed pipeline (no CDN, works offline, single binary preserved).
- **FR-6:** Routes: `/` — project dashboard (spec list with status/progress, fixes
  list, quick health from `relic validate` data); `/spec/<id>` — the spec view
  (rendered fragment + derived components + tabs/nav for spec.md, plan.md, tasks.md
  rendered from disk); `/fix/<id>` — fix document view. Unknown route → dashboard.
- **FR-7:** Cross-spec integration: artifact references, `[blocked by: <spec>]`
  markers, and owns/reads relationships render as links to the owning spec's view.
  Dark/light theme preserved (single stylesheet, persisted preference).
- **FR-8:** The viewer is **strictly read-only**. GET only; the server never mutates
  `.relic/`; the CLI remains the only writer.

### Functional — server

- **FR-9:** `relic serve [--port <n>] [--text]` starts the per-project HTTP server:
  serves the embedded frontend assets and a JSON API that reads `.relic/` live per
  request (no caching layer in v1 — correctness over speed). Localhost bind only.
- **FR-10:** Port resolution: `--port` flag → `config.json` `viewer.port` → default
  `4747`. If the port is busy with a healthy relic viewer for the SAME project, reuse
  it (report the URL); if busy otherwise, auto-increment to the next free port.
- **FR-11:** Lifecycle state in `.relic/viewer.json` (gitignored, like session.json):
  `{ port, pid, started_at }`. A health endpoint (`/api/health` returning project path
  + version) lets callers verify the instance matches the project before reusing.
- **FR-12:** JSON API (shapes in `ViewerContract.md`): `/api/health`, `/api/project`
  (specs index + fixes index + validate summary), `/api/spec/<id>` (fragment +
  markdown files + derived data), `/api/fix/<id>`.

### Functional — MCP

- **FR-13:** `relic mcp` runs an MCP server on stdio with a minimal tool surface:
  `view_spec(spec_id)`, `view_fix(fix_id)`, `list_views()`. Each tool ensures the HTTP
  server is running (health-check → reuse, else spawn detached) and returns the URL
  (plus title/status context for the agent to relay).
- **FR-14:** The plugin ships `.mcp.json` wiring `relic mcp` — installing the plugin
  gives the agent the tools with zero configuration. MCP protocol details are pinned
  against current docs at implementation time (plan Phase 1).

### Functional — migration & re-teaching

- **FR-15:** `relic scaffold` creates new spec HTML as a fragment (from a new minimal
  template). `relic viewer-migrate` converts legacy full-document spec/fix HTML:
  extracts the content region (sentinels or heuristics — reusing the html-rebase
  extractor), maps legacy component usage to the new tag grammar where mechanical,
  wraps the result in `<relic-body>`, and reports anything needing manual attention.
  `relic upgrade` runs the migration and removes the superseded `.relic/base.html`
  (relic-managed file, reported).
- **FR-16:** `relic html-sync` is retired: the command reports its retirement and
  points to `relic serve` / `relic viewer-migrate`. Chrome re-basing has no successor
  — there is no chrome in project files any more.
- **FR-17:** The `html-mode` prompt snippet is rewritten for fragments: author semantic
  tags only inside `<relic-body>`; prefer derived tags over transcription; the full
  tag reference is available via `relic snippet viewer-components` (new snippet) and
  rendered at the viewer's `/docs` route.

### Non-Functional

- **NFR-1:** Localhost-only bind; no auth in v1; GET-only.
- **NFR-2:** Viewer assets fully embedded — no network fetches at runtime; works
  air-gapped.
- **NFR-3:** Fragment parsing on the server must be tolerant (never throw on malformed
  input — degrade per FR-3) and the same parser feeds `relic validate` lint (one
  implementation, two consumers).
- **NFR-4:** Cold start under ~1s for typical projects; API reads are per-request from
  disk (no stale views).
- **NFR-5:** Cross-platform (macOS/Linux/Windows), both distribution channels (Node
  bundle and compiled binaries).
- **NFR-6:** Everything else keeps working with the server down: md mode untouched;
  fragments are still committed, diffable text files.

---

## User Stories

- As a **developer**, I ask "show me spec 009" and the agent hands me a URL; the page
  is styled, current, and navigable across specs — no file:// weirdness, no stale
  embedded copies.
- As a **developer**, when the LLM typos a component attribute I see one inline
  warning chip in an otherwise perfect page — not a blank document.
- As a **tech lead**, task progress and artifact tables in the views are computed from
  the actual files, so I trust them.
- As a **plugin user**, I never configure anything: the MCP tools arrived with the
  plugin, the port came from config.json.
- As a **relic maintainer**, frontend fixes ship in the CLI version — no per-project
  chrome to migrate ever again.

---

## Scope

### In Scope

- `packages/viewer/` React app + embed pipeline; dashboard, spec, fix, docs routes
- Fragment format (`<relic-body>` + derived/authored tags) for specs and fixes
- `relic serve`, port/lifecycle model (`viewer.json`), JSON API
- `relic mcp` (stdio) + plugin `.mcp.json`
- `relic validate` fragment linting; `relic viewer-migrate`; `html-sync` retirement
- `config.json` `viewer.port`; prompt snippet rewrite + `viewer-components` snippet
- `ViewerContract.md` (new, owned); supersession notes on `HtmlComponentContract.md`

### Out of Scope

- Brain/artifact-graph rendering (future spec — the marquee follow-up on this infra)
- Static export (`relic export`) / file:// support
- Remote access, auth, HTTPS, collaboration
- Any write path over HTTP (server stays read-only)
- Editing views in the browser
- MCP resources/prompts (tools only in v1)

---

## Shared Artifacts

**Owns:**
- `shared/contracts/ViewerContract.md` — fragment tag grammar (derived + authored),
  JSON API shapes, port/lifecycle model, MCP tool surface, migration rules

**Reads:**
- `shared/contracts/HtmlComponentContract.md` (owned by 008) — superseded by this spec;
  gains a historical pointer (cross-spec, changelog required)
- `shared/domains/ProjectConfigDomain.md` (owned by 008) — extended with `viewer.port`
- `shared/contracts/ContextResultContract.md` (owned by 003) — unchanged unless
  implementation adds a viewer field (decide at plan review)
- `shared/contracts/ClaudePluginContract.md` (owned by 011) — extended with `.mcp.json`
- `shared/domains/TemplateDomain.md` — fragment template added

---

## Open Questions

- [ ] **OQ-1:** MCP stdio protocol/SDK details (framing, tool schema format, `.mcp.json`
  shape for plugins) — pin against current docs at implementation start, recorded in
  `ViewerContract.md`.
- [ ] **OQ-2:** Should `relic context` expose the viewer state (port/running) so agents
  can link without the MCP round-trip? Lean: yes, additive `viewer` field — decide at
  plan review.
- [ ] **OQ-3:** Legacy component usages that are not mechanically mappable during
  migration (hand-written layout divs, custom CSS in content regions) — migrate
  best-effort into a `<relic-section>` with raw content, or flag-and-skip? Lean:
  best-effort + validation warning.
- [ ] **OQ-4:** Does `relic-doc-keeper` (011) stay HTML-free after this spec? Lean: yes
  — derived components remove most of the need; fragment authoring stays inside
  workflow commands' HTML step only (D-9 becomes permanent policy).

---

## Decisions

- **D-1 (2026-07-02, owner):** Views are served by a **local per-project server**
  embedded in the CLI; the `.relic/` folder is the backend; MCP is the delivery
  channel to agents.
- **D-2 (2026-07-02, owner):** Authored surface is **semantic tags + server-derived
  data components** — no LLM-facing templating syntax; Jinja-style templating stays an
  internal server concern at most.
- **D-3 (2026-07-02, owner):** Frontend stack is **React** with real stylesheet files,
  Bun-bundled and embedded (chosen over Preact for ecosystem headroom — the future
  brain graph).
- **D-4 (2026-07-02, owner):** MCP v1 is **tools-only, minimal** (`view_spec`,
  `view_fix`, `list_views`), shipped via the plugin's `.mcp.json`.
- **D-5 (2026-07-02, owner):** Server lifecycle is **per-project and lazy** with the
  port from `config.json` (`viewer.port`, default 4747, auto-increment on conflict).
- **D-6:** The server is strictly read-only; the CLI remains the only writer of
  `.relic/`.
- **D-7:** file:// support is dropped; a static export may return post-1.0 if demanded.
