# ProjectConfigDomain

**Type:** domain
**Owned by:** 008-html-spec-mode
**Confidence:** high

## Description

The per-project configuration domain. `config.json` is the single committed configuration file in `.relic/`, replacing the earlier `engines.json`. It stores project-level settings that apply to all team members and must be committed to version control.

## Key Entities

- **`.relic/config.json`** — committed JSON file with the following shape:
  ```json
  {
    "engines": ["claude", "copilot"],
    "mode": "md"
  }
  ```
  - `engines`: array of active engine names (replaces `.relic/engines.json`)
  - `mode`: scaffold output mode — `"md"` (default) or `"html"`

- **`packages/utility/src/project-config.ts`** — replaces `engines-registry.ts`. Reads and writes `config.json`, handles the `engines.json` → `config.json` migration, and exports typed helpers for reading the engines list and the mode.

- **Migration from `engines.json`**: If `.relic/engines.json` exists and `.relic/config.json` does not, any command that reads config performs a silent migration: reads `engines.json`, writes `config.json` with `{ engines: <content>, mode: "md" }`, and removes `engines.json`. Migration is idempotent.

- **`relic mode <md|html>`**: CLI command that sets `config.json.mode`. When switching to `html`, also scaffolds `.relic/base.html` from the embedded template if not already present.

- **`relic context` `mode` field**: The `relic context` JSON output includes `"mode"` so AI workflow commands can check whether the HTML step is active without reading `config.json` directly.

- **`.relic/base.html`**: Self-contained component library and CSS utility layer. Scaffolded by `relic mode html`; never overwritten once created — the user owns it after first write. Embeds Tailwind CSS standalone (or equivalent utility CSS) and inline JS primitives for charts (bar, pie, line), flow diagrams, dependency graphs, and other visualisations. Every component is invocable via a short declarative API. A `<!-- RELIC COMPONENTS -->` inventory comment block documents the full API so the LLM can read it before authoring HTML files. All JS and CSS are embedded inline — no CDN links, works offline.

- **`<spec-id>.html`**: Per-spec living HTML document (e.g. `008-html-spec-mode.html`). Named by spec ID to avoid tab collisions when multiple specs are open. Committed alongside `spec.md`, `plan.md`, `tasks.md`. Created once by `relic scaffold` as an empty shell referencing `base.html` via `../../base.html`. Updated by the LLM at the end of every spec workflow command session (specify, clarify, plan, tasks, implement). The LLM makes short declarative calls to `base.html` components — keeping token cost low. Accumulates charts, flows, cross-references, status views. It is a first-class spec artefact and may replace Markdown review. The CLI never overwrites it after initial creation.

- **`<fix-id>.html`**: Per-fix HTML document (e.g. `2026-05-20-publish-credentials-stale.html`). When `mode = "html"`, this replaces `<fix-id>.md` — one file per fix, format determined by mode at creation time. Named by fix ID to avoid tab collisions. Lives in `.relic/fixes/`. Created by `/relic.fix`; references `base.html` via `../base.html`. Contains all fields defined in `FixDocumentContract.md` (spec 003) expressed via components: issue, root cause classification badge, proposed changes as a flow diagram, affected files table, changelog draft, and status. Updated by `/relic.solve` (sets status to `solved`). When `mode = "md"`, `/relic.fix` creates `<fix-id>.md` as before — no HTML. The two modes are mutually exclusive. Committed to version control.

## Invariants

- `config.json` is always committed — never gitignored.
- `base.html` is written at most once by Relic; subsequent `relic mode html` calls skip it.
- `spec.html` after initial creation is the LLM's document — the CLI infrastructure never overwrites it.
- Unknown mode values are rejected at the CLI; the valid set is `{ "md", "html" }`.
- The HTML update logic for workflow commands lives in `templates/prompts/*.md` per Constitution Principle II — not in TypeScript.

## Relationships

- Replaces UpgradeDomain (spec 004) reference to `engines.json` — `relic upgrade` and `relic add-engine` must read/write `config.json` via `project-config.ts` instead of `engines-registry.ts`
- Extends TemplateDomain (spec 004) — `templates/base.html` is embedded via the same `embed-templates.ts` pipeline
- Extends ScaffoldResultContract — `files_created` conditionally includes `spec.html` when created in HTML mode
