# HtmlComponentContract

**Type:** contract
**Owned by:** 008-html-spec-mode
**Confidence:** high

## Description

The component API contract between `base.html` (provider) and the LLM writing spec/fix HTML files (consumer). Defines the available component primitives, the CSS utility layer, invocation syntax, file naming conventions, and the rules the LLM must follow to produce valid HTML output with low token cost.

## Design Principles

- **Declarative and short**: each component call in a spec/fix HTML file is a single tag or short function call. The full rendering logic lives in `base.html`.
- **Utility CSS, not inline styles**: `base.html` embeds Tailwind CSS standalone (or equivalent) so HTML files use class names, not verbose inline style attributes.
- **Self-documenting in `base.html`**: a `<!-- RELIC COMPONENTS -->` comment block at the top of `base.html` enumerates every available component with its invocation syntax. The LLM reads this block before authoring any HTML file.
- **No CDN at runtime**: all JS and CSS are embedded inline in `base.html`. Files work offline and in air-gapped environments.

## Component Inventory (initial set)

The initial `templates/base.html` ships with the following components:

| Component | Purpose | Invocation pattern |
|---|---|---|
| `<relic-chart>` | Bar, pie, or line chart | `<relic-chart type="bar" data='[...]' labels='[...]'>` |
| `<relic-flow>` | Mermaid-compatible flow/sequence diagram | `<relic-flow>graph LR; A --> B</relic-flow>` |
| `<relic-status>` | Status badge (pending / in-progress / done / risk) | `<relic-status value="done">Label</relic-status>` |
| `<relic-table>` | Structured data table from JSON | `<relic-table headers='[...]' rows='[[...]]'>` |
| `<relic-callout>` | Highlighted callout block (info / warn / risk) | `<relic-callout type="warn">Text</relic-callout>` |
| `<relic-progress>` | Numeric progress bar | `<relic-progress value="7" max="12">` |

## File Naming Convention

HTML files are named by their artefact ID, not generically:

| Artefact | Location | Filename | How components are available |
|---|---|---|---|
| Spec | `.relic/specs/<spec-id>/` | `<spec-id>.html` | Components embedded inline (copy of `base.html` content) |
| Fix | `.relic/fixes/` | `<fix-id>.html` | Components embedded inline (copy of `base.html` content) |

Naming by ID prevents tab name collisions when multiple HTML files are open simultaneously.

## Loading Model

`<spec-id>.html` and `<fix-id>.html` are **self-contained documents**. When `relic scaffold` creates a spec HTML file, it copies the full `base.html` content (substituting `{{SPEC_ID}}` and `{{TITLE}}`). All CSS and JS are embedded inline — there is no separate load step and no reference to an external `base.html` file. This ensures files open correctly regardless of where they are accessed from.

`base.html` is the source template for new files; customising it does not retroactively affect already-created spec or fix HTML files.

## HTML File Conventions

### Spec HTML (`<spec-id>.html`)
1. Self-contained: all component CSS/JS is embedded inline — no external dependencies.
2. The `<title>` is the spec title (e.g. `008 — HTML Spec Mode`).
3. Body is organised into sections matching the spec structure: Overview, Requirements, Plan, Tasks, Artifacts.
4. Each section may contain text, `<relic-*>` component calls, and standard HTML with utility CSS classes.
5. The LLM enriches sections based on its session work — not a mechanical transcription but synthesis and visualisation.
6. The LLM reads the file before updating it to preserve existing content; it appends to or updates the relevant sections.

### Fix HTML (`<fix-id>.html`)

When `mode = "html"`, `<fix-id>.html` is the fix document — there is no `<fix-id>.md`. One file per fix; format determined by mode at creation time.

The HTML fix document must carry all fields defined in `FixDocumentContract.md` (spec 003), expressed via components:

1. Self-contained: all component CSS/JS is embedded inline.
2. The `<title>` is the fix ID (e.g. `2026-05-20 — Publish Credentials Stale`).
3. Body sections — each maps to a `FixDocumentContract.md` field:
   - **Date / Owning spec / Status** — `<relic-status>` badge (`pending` / `solved`) + metadata line
   - **Issue** — prose description as reported
   - **Root Cause** — `<relic-callout type="info">` with classification badge (`code-bug` / `misspecification` / `misunderstanding` / `wrong-spec`) + explanation
   - **Proposed Changes** — `<relic-flow>` diagram for code changes; `<relic-table>` for affected files
   - **Spec / Shared artifact amendments** — `<relic-callout>` per amendment, if present
   - **Changelog entry (draft)** — verbatim code block
4. `/relic.fix` creates the HTML file and populates all pending-state sections.
5. `/relic.solve` updates the Status badge to `solved` and marks proposed changes as applied.

When `mode = "md"`, `/relic.fix` creates `<fix-id>.md` per `FixDocumentContract.md` — no HTML file is created. The two modes are mutually exclusive.

## Lifecycle

- `base.html` is written once by `relic mode html`; the user owns it after that. Teams may add custom components.
- `<spec-id>.html` is created once by `relic scaffold` in HTML mode; updated by every spec workflow command session (specify, clarify, plan, tasks, implement).
- `<fix-id>.html` is created by `/relic.fix` when `mode = "html"` — it is the fix document, replacing `<fix-id>.md`. Updated by `/relic.solve`.
- When `mode = "md"`, `/relic.fix` creates `<fix-id>.md` per `FixDocumentContract.md` — no HTML. The two modes are mutually exclusive.
- Neither HTML file is overwritten by the CLI after initial creation — the LLM is the sole updater.
- All HTML artefact files are committed to version control as first-class documents.
