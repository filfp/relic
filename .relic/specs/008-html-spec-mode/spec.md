# Spec: HTML Spec Mode

**Spec ID:** 008-html-spec-mode
**Created:** 2026-05-19
**Status:** draft

---

## Overview

Relic specs are currently expressed exclusively as Markdown files. While Markdown is AI-native and git-friendly, it limits the richness of the LLM's output. This spec introduces a `mode` setting (`md` | `html`) that unlocks a complementary HTML layer alongside the existing Markdown files.

When `mode = "html"`, every AI workflow command that can mutate spec files gains a final HTML step: after completing its Markdown work, the LLM reads the spec's HTML file and enriches it with the full context of that session — charts, flow diagrams, dependency graphs, status views, and structured cross-references that Markdown cannot express. The HTML file grows with the spec; it is not a static compilation.

The key to low token cost is `base.html`: a self-contained component library that ships reusable JavaScript primitives for charts, flows, and diagrams, styled by an embedded utility CSS library (Tailwind standalone build or equivalent). When the LLM writes the HTML file, it makes short declarative calls to these pre-built components rather than authoring raw SVG or JS from scratch. `base.html` is the vocabulary; the HTML spec/fix file is the page that uses it. Both are committed — the HTML files are first-class artefacts that can replace or augment Markdown review.

The HTML layer applies to both spec files and fix documents. Each spec in HTML mode produces `<spec-id>.html` in its spec directory. Each fix document in HTML mode produces `<fix-id>.html` **instead of** `<fix-id>.md` — one file per fix, not two. When mode is `html`, the HTML file is the fix document; the `.md` format is mode-specific, not universal. Naming by ID means multiple HTML files can be open simultaneously without tab name collisions.

This spec also consolidates the per-project configuration file: `engines.json` (a bare JSON array) is replaced by `config.json` (a keyed object) hosting both the engines list and the mode setting, and `engines-registry.ts` is renamed to `project-config.ts` to reflect its broadened responsibility.

---

## Requirements

### Functional Requirements

**Config file migration**

- FR-1: `relic init` must write `.relic/config.json` (not `engines.json`) for new projects. Shape: `{ "engines": [], "mode": "md" }`.
- FR-2: `relic add-engine` and `relic upgrade` must read and write `config.json`. Backwards-compatible: if `engines.json` exists and `config.json` does not, migrate automatically on first read — read the array, write `config.json`, remove `engines.json`.
- FR-3: `config.json` is committed (not gitignored) — it is project-level configuration, not personal session state.
- FR-4: `packages/utility/src/engines-registry.ts` is renamed to `packages/utility/src/project-config.ts`. All exports are updated to match the broader responsibility (engines list + mode). Spec 004 (`UpgradeDomain.md`) must be updated to reflect this rename during plan/implement — flagged as a cross-artifact mutation.

**Mode CLI command**

- FR-5: `relic mode <md|html>` sets the `mode` field in `.relic/config.json`. Unknown values are rejected with a clear error.
- FR-6: `relic mode html` additionally scaffolds `.relic/base.html` from the embedded `templates/base.html` template **if the file does not already exist**. If it already exists it is left untouched — the user owns it after first write.
- FR-7: `relic mode` (no argument) prints the current mode in JSON: `{ "mode": "md" }`.

**Context command**

- FR-8: `relic context` JSON output includes a `mode` field reflecting the current value from `config.json`. AI workflow commands use this to determine whether the HTML step is active.

**HTML scaffold — spec files**

- FR-9: When `mode = "html"`, `relic scaffold` creates `<spec-id>.html` in the spec directory **if it does not already exist**. The file is `base.html` with spec title and ID substituted. `files_created` includes `<spec-id>.html` when it is created. The filename uses the spec ID (e.g. `008-html-spec-mode.html`) so multiple spec files can be open simultaneously without tab name collisions.
- FR-10: `<spec-id>.html` is never overwritten by the CLI after initial creation. The LLM is the sole writer from that point on.
- FR-11: When `mode = "md"` (default), scaffold behaviour is unchanged — no HTML file is created.

**HTML scaffold — fix documents**

- FR-12: When `mode = "html"`, `/relic.fix` creates `<fix-id>.html` in `.relic/fixes/` **instead of** `<fix-id>.md`. There is exactly one file per fix — the format is determined by mode at the time `/relic.fix` is run. Named by fix ID for tab-collision reasons.
- FR-13: `<fix-id>.html` is never overwritten by the CLI after initial creation. The LLM updates it via the HTML steps in `fix.md` and `solve.md` prompts.
- FR-13b: When `mode = "md"` (default), `/relic.fix` creates `<fix-id>.md` as defined by `FixDocumentContract.md` (spec 003). No `.html` file is created. The two modes are mutually exclusive — one file per fix, format determined by mode.

**AI workflow command HTML step — spec commands**

- FR-14: The prompt templates for `specify.md`, `clarify.md`, `plan.md`, `tasks.md`, and `implement.md` gain a conditional HTML step: *"If `relic context` shows `mode = "html"`, read `<spec-id>.html` and update it with enriched content reflecting the full work done in this session. Use the components from `base.html` (read its component inventory) to produce charts, flows, and structured sections."* The HTML step must be positioned **before** the `## When done, confirm` checklist (or equivalent terminal section) — it is the last substantive work step, not a postscript. The confirm checklist must include an HTML item: `If mode is "html": <spec-id>.html updated.`
- FR-15: The HTML step is the LLM's own synthesis. It is not a mechanical transcription of the Markdown. The intent is enrichment: richer structure, visualisations, cross-references.

**AI workflow command HTML step — fix commands**

- FR-16: `fix.md` must check mode at the very top (Step 0, before any file creation) via `relic context`. Based on `mode`, the agent commits to either `<fix-id>.html` (html) or `<fix-id>.md` (md) for the entire session. Step 5 branches on this decision — the fix document is created in the correct format from the start, not retroactively converted at the end. `solve.md` must also read mode in Step 1 and conditionally read `.html` or `.md` in Step 2.
- FR-17: When `mode = "html"`, the HTML fix document IS the fix document — it is not a complement to a `.md` file. All fields from `FixDocumentContract.md` (issue, root cause, proposed changes, changelog draft, status) are present in the HTML, rendered via `base.html` components.

**`base.html` component library**

- FR-18: `base.html` must include an embedded utility CSS library (Tailwind CSS standalone build or equivalent) — no CDN links. This keeps HTML files concise and visually consistent without verbose inline styles.
- FR-19: `base.html` must include self-contained reusable JS/HTML components for at minimum: charts (bar, pie, line), flow diagrams, dependency graphs, status badges, tables, callouts, and progress bars. All JS libraries (e.g. Mermaid.js) must be embedded inline.
- FR-20: Each component must be invocable with a short, declarative API so that HTML authoring requires minimal tokens per visualisation.
- FR-21: `base.html` must include a `<!-- RELIC COMPONENTS -->` inventory comment block listing all available components with their invocation syntax. This is the LLM's reference when authoring spec/fix HTML files.
- FR-22: Spec HTML files (`<spec-id>.html`) reference `base.html` via `../../base.html` (relative from `.relic/specs/<spec-id>/`). Fix HTML files (`<fix-id>.html`) reference it via `../base.html` (relative from `.relic/fixes/`).

**Template embedding**

- FR-23: `templates/base.html` is embedded by `scripts/embed-templates.ts` into `packages/core/src/generated/templates.ts` alongside the existing Markdown templates. No HTML file is accessed from disk at runtime.

### Non-Functional Requirements

- NFR-1: The `engines.json` → `config.json` migration is backwards-compatible and silent. Projects that have not yet run any 008 command must continue to work.
- NFR-2: `base.html` is written at most once by Relic; subsequent `relic mode html` calls skip it if it exists.
- NFR-3: `base.html` is fully self-contained — all JS and CSS are embedded inline, no external CDN links, works offline and in air-gapped environments.
- NFR-4: All new commands follow Constitution Principle V — JSON output by default, `--text` flag for human-readable output.
- NFR-5: No new runtime `dependencies` in `packages/cli-node/package.json`. Initial HTML file generation uses string interpolation in TypeScript.
- NFR-6: Per Constitution Principle II, the HTML update logic for workflow commands lives in `templates/prompts/*.md`, not in TypeScript.
- NFR-7: `<spec-id>.html` and `<fix-id>.html` are committed. They are first-class artefacts equivalent in standing to the Markdown files and may replace Markdown review.

---

## User Stories

- As a developer, I want `relic mode html` to switch my project to HTML spec mode, so that every workflow command produces a richer named HTML file alongside the standard Markdown files.
- As a developer, I want spec and fix HTML files named by their ID, so that multiple tabs can be open simultaneously without name collisions.
- As a developer, I want HTML files committed alongside the Markdown files, so that they can serve as a richer alternative to Markdown review — with charts, flows, and diagrams.
- As an LLM agent, I want to know the project mode from `relic context`, so that I can decide whether to execute the HTML step at the end of a workflow command.
- As an LLM agent, I want a pre-built component library in `base.html` with utility CSS, so that I can write short declarative component calls rather than authoring raw SVG, JS, or verbose inline styles — keeping token cost low.
- As an LLM agent, I want every spec workflow command (specify, clarify, plan, tasks, implement) to have an HTML step, so that the HTML file stays in sync with the spec's current state after every session.
- As an LLM agent, I want the fix and solve commands to have an HTML step, so that fix documents are also richly visualised when HTML mode is active.
- As a developer, I want `.relic/base.html` to be customisable after first write, so that I can extend the component library with project-specific visualisations.
- As an adopter, I want my existing `engines.json` to be automatically migrated to `config.json`, so that upgrading Relic does not break my workflow.

---

## Scope

### In Scope

- Rename `engines-registry.ts` → `project-config.ts` and update all callers
- Introduce `.relic/config.json` with `{ engines, mode }` — replaces `engines.json`
- Auto-migration from `engines.json` to `config.json` on first read
- `relic mode <md|html>` CLI command (production binary)
- Expose `mode` in `relic context` JSON output
- `relic scaffold` creates initial `<spec-id>.html` shell from `base.html` in HTML mode
- `/relic.fix` creates `<fix-id>.html` in HTML mode **instead of** `<fix-id>.md` — one file per fix, format determined by mode
- `templates/base.html` — self-contained component library with inline JS and embedded utility CSS (Tailwind standalone or equivalent), embedded via `embed-templates.ts`
- Spec HTML files reference `base.html` via `../../base.html`; fix HTML files via `../base.html`
- Add HTML step to `specify.md`, `clarify.md`, `plan.md`, `tasks.md`, `implement.md` prompt templates (spec HTML)
- Add HTML step to `fix.md` and `solve.md` prompt templates (fix HTML)
- Update `ScaffoldResultContract` to document conditional `<spec-id>.html` in `files_created`
- Update `UpgradeDomain.md` (spec 004 cross-artifact mutation, changelog required)

### Out of Scope

- Real-time filesystem watching or auto-regeneration outside of workflow commands
- Serving HTML files over HTTP (no local dev server)
- Generating HTML for shared artifacts (domains, contracts, rules, assumptions)
- Generating HTML for `ask`, `scan`, `analyse`, or other non-spec/non-fix commands
- CSS frameworks requiring a build step — the embedded utility CSS must be a single inline stylesheet
- Changing or deleting Markdown files when HTML mode is active

---

## Shared Artifacts

**Owns:**
- `shared/domains/ProjectConfigDomain.md` *(new)* — describes `config.json`, migration rules, mode semantics, `project-config.ts`, and HTML file lifecycle
- `shared/contracts/ScaffoldResultContract.md` *(claimed — was unowned)* — extended to document conditional `<spec-id>.html` in `files_created`
- `shared/contracts/HtmlComponentContract.md` *(new)* — defines the component API between `base.html` (provider) and the LLM (consumer): component inventory, CSS utility, invocation syntax, spec/fix HTML conventions and relative paths

**Reads:**
- `shared/domains/UpgradeDomain.md` *(owned by 004)* — documents `engines.json` and `engines-registry.ts`; must be updated during plan/implement (cross-artifact mutation, changelog required)
- `shared/domains/TemplateDomain.md` *(owned by 004)* — `base.html` uses the same `embed-templates.ts` pipeline
- `shared/contracts/FixDocumentContract.md` *(owned by 003)* — defines the `.md` fix schema (applies when `mode = "md"`). When `mode = "html"`, `HtmlComponentContract.md` supersedes it for fix documents. The two contracts coexist for their respective modes; spec 003's artifact is not modified.

---

## Open Questions

*(none)*

---

## Decisions

- **OQ-1 resolved:** `engines-registry.ts` → `project-config.ts`. Intersection with spec 004 addressed via changelog entry at plan/implement time.
- **OQ-2 resolved:** `mode` is the confirmed name for the config key and CLI command.
- **OQ-3 resolved:** HTML files are living LLM-enriched documents, not static compilations. AI workflow commands write to them; CLI only creates the initial shell from `base.html`.
- **OQ-4 resolved:** `base.html` is the initial scaffold and component library; `<spec-id>.html` / `<fix-id>.html` are the spec/fix files that the LLM updates. CLI never overwrites them after creation.
- **OQ-5 resolved:** HTML files are committed. They are first-class artefacts equivalent in standing to the Markdown files.
- **Component library decision:** `base.html` ships with an embedded Tailwind standalone CSS and inline JS primitives for charts, flows, diagrams, and other visualisations. The component inventory is documented in a `<!-- RELIC COMPONENTS -->` block inside `base.html`.
- **Naming decision:** HTML files are named by their ID (`<spec-id>.html`, `<fix-id>.html`), not generically, to avoid tab name collisions.
- **Fix HTML decision:** When `mode = "html"`, `/relic.fix` creates `<fix-id>.html` instead of `<fix-id>.md`. One file per fix; format determined by mode at creation time. The HTML document contains all fields from `FixDocumentContract.md` rendered via components. `HtmlComponentContract.md` supersedes `FixDocumentContract.md` for the HTML mode fix format. Spec 003's contract is not modified.
- **Command coverage decision:** All spec workflow commands (specify, clarify, plan, tasks, implement) and fix workflow commands (fix, solve) get the HTML step. There is no filesystem watcher — HTML stays in sync because all mutating commands update it.
