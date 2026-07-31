# Relic 2.0 — Codebase Disposition Inventory

> **Status:** accepted, 2026-07-30
> **Sources:** [`relic-2.0.md`](relic-2.0.md) and
> [`relic-2.0-work-order.md`](relic-2.0-work-order.md)

This inventory decides how the Relic 1.x codebase may influence Relic 2.0. It is not a
promise to preserve implementation merely because a similar capability still exists.
The accepted 2.0 contracts define the product; the 1.x code is evidence that may be
retained only when it serves those contracts cleanly.

## Disposition Rule

Every subsystem has one of four dispositions:

- **keep**: its current responsibility and implementation already fit Relic 2.0;
- **adapt**: a bounded implementation can be retained after removing its 1.x
  assumptions;
- **replace**: the capability remains, but its current implementation is shaped by the
  wrong contracts;
- **remove**: neither the capability nor its implementation belongs in Relic 2.0.

There is no presumption of reuse. When evidence leaves a choice between adapting 1.x
code and removing it, remove it and rebuild from the accepted 2.0 contracts. An
**adapt** classification requires positive evidence that the retained code has a clear
boundary, useful tests, and no hidden dependency on 1.x workflows, modes, sessions,
ownership, manifests, or generated state. Superficial functional similarity is not
enough.

The current `.relic/` tree has a separate status: **deferred evidence**. It remains
unchanged through the isolated 2.0 build and does not constrain the replacement
architecture.

## Workspace and Package Structure

| Surface | Disposition | Relic 2.0 boundary |
| --- | --- | --- |
| Bun and TypeScript workspace | **keep** | Continue as the implementation and test foundation. |
| `cli`, `core`, `utility`, `engines`, and `viewer` package separation | **adapt** | Keep only useful package boundaries. `core` becomes a pure read model independent of commands, HTTP, React, and engines. |
| npm CLI distribution | **adapt** | Publish the four-command 2.0 CLI. |
| PyPI wrapper and platform binaries | **keep/adapt** | Retain the delivery mechanism while pointing it at the 2.0 executable. |
| React and Vite viewer | **adapt** | Retain the frontend platform, not its 1.x information architecture. |
| Root `index.ts` | **remove** | It is not a 2.0 product entry point. |
| Current repository `.relic/` | **deferred evidence** | Do not migrate or use it as an acceptance fixture before the operational 2.0 gates pass. |

Package names may survive when their boundaries remain useful. They do not prevent
moving or deleting implementations whose responsibilities no longer fit those
boundaries.

## CLI

### Replace or adapt

- Replace `init` with initialization of `.relic/RELIC.md` and its default corpus
  directories only, without changing `AGENTS.md`, defining project governance, or
  creating secondary state.
- Replace `search` against the exhaustive 2.0 knowledge read model.
- Replace the command registration in `bin.ts` with exactly `init`, `install`,
  `search`, and `serve`.
- Adapt from `serve` only the proven localhost server behavior, safe `GET`/`HEAD`
  handling, embedded assets, and SPA fallback. Replace its API and lifecycle around the
  new read model.
- Introduce `install`, absorbing the useful intent of engine addition and skill
  refresh. `install --engine <engine>` installs the selected central skill
  idempotently; no-argument installation discovers known project-local engine roots.

### Remove

- `validate`, `use`, `scan`, `context`, `scaffold`, `write`, `toon-migrate`, `mode`,
  `snippet`, `external`, `viewer-migrate`, `html-sync`, `upgrade`, and `mcp`;
- the `specify`, `clarify`, `plan`, `analyse`, `tasks`, `implement`, `fix`, `ask`, and
  `solve` workflow commands;
- `bin.debug.ts` and direct model-integration behavior;
- command-owned sessions, active-spec selection, mode switching, cognitive routing,
  generated changelogs, and prompt orchestration.

The current MCP surface is **remove**, not **adapt**. Any future MCP capability must be
justified independently by distribution or user-experience evidence after the minimal
product works.

## Core

### Replace

- Replace the current `view-data` model with one pure, exhaustive knowledge read model.
- Replace the public core types around topology, canonical documents, searchable
  artifacts, links, backlinks, memberships, and localized diagnostics.
- Replace the current fragment implementation with a single tolerant parser and AST for
  the accepted typed HTML vocabulary.
- Replace viewer-owned Markdown parsing with a single core Markdown parser and AST for
  canonical Markdown.

The new core must not depend on the CLI, HTTP server, React, engine adapters, session
state, or generated output. Tolerant parsing behavior and focused existing tests may be
retained as evidence; the existing parser structure has no presumption of reuse.

### Remove

- artifact registries and manifests;
- ownership/intersection analysis;
- structured changelog state;
- context builders and generated prompt context;
- HTML rebasing machinery tied to generated fragments;
- active-spec, active-fix, task, mode, and session semantics.

## Utility

| Surface | Disposition | Relic 2.0 boundary |
| --- | --- | --- |
| Filesystem helpers and Relic root discovery | **adapt** | Retain only traversal and path behavior that is independent of 1.x state. |
| Project configuration | **replace** | Load structured topology from `RELIC.md`; remove `config.json`, `config.yaml`, declared engines, and persisted counters. |
| Session and spec-ID scanning | **remove** | No active session or directory-derived authority remains. |
| TOON, fetch, and generated-snippet utilities | **remove** | They support deleted delivery and workflow machinery. |
| External-repository traversal subsystem | **remove** | Preserve safe traversal as a design principle, not this subsystem. |

## Viewer and Local Server

### Keep or adapt

- Adapt the application shell, theme, and CSS.
- Adapt `Chart`, `Flow`, `Callout`, and `Chip` only where their knowledge remains in
  ordinary child content and they satisfy the accepted semantic HTML contract.
- Keep or adapt the embedded-asset delivery mechanism.
- Retain localhost-only serving, safe `GET`/`HEAD`, embedded assets, SPA fallback, and a
  read-only runtime.

### Replace

- Replace API routes and main routes around repository-relative document paths and the
  new internal knowledge API.
- Replace the dashboard with an exhaustive catalog-first view.
- Replace the spec page with a generic canonical-document page and a separate artifact
  listing for specification folders.
- Replace fragment rendering against the new core AST.
- Replace viewer-local Markdown parsing and components with rendering of the core
  Markdown AST.
- Adapt the component reference to document only the surviving semantic vocabulary.

### Remove

- `FixPage`, derived workflow data, status/progress interpretation, task views, and JSON
  attribute tables;
- spec/fix endpoints, ID-only authority, fixed spec/plan/tasks tabs, and validation
  summaries;
- `viewer.json`, configured-port state, process reuse/discovery, and stateful viewer
  lifecycle;
- parsing and knowledge interpretation inside the HTTP layer;
- any viewer mutation path or MCP viewer bridge.

Diagnostics become local chiplets attached to affected catalog entries, documents,
links, or artifacts. They are read-model evidence, not a validation workflow or status
system.

## Engines, Skills, and Plugin

### Adapt or absorb

- Adapt the `@relic/engines` package into thin native-installation adapters.
- Replace the Claude, Codex, Copilot, and future adapters with one responsibility:
  copy the central Relic skill into the engine's project-local native skill directory.
- Absorb the proven generic reasoning behavior of `architecture-roast` into the central
  Relic skill.
- Absorb the minimal direct record-writing behavior of `requirement-records` into the
  central skill and `RELIC.md` instructions.

The canonical central skill source belongs to a distribution-owned directory.
`.codex/skills/` and `.claude/skills/` are observed installations or development
evidence, not the product source of truth. Relic does not install or maintain a global
user skill.

### Remove

- current Claude commands, Codex commands, and GitHub prompt files;
- the separate `requirement-records` skill after its useful behavior is absorbed;
- ambient plugin routing skills and mandatory invocation machinery;
- plugin manifests, marketplace state, `.mcp.json`, and permission/cognitive
  configuration edits;
- `build-plugin.ts` and `embed-engine-templates.ts`;
- engine behavior that edits `AGENTS.md`, orchestrates prompts, or installs more than
  the central skill.

## Templates

Remove the current template set: preamble, constitution, base specification HTML,
specification/plan/tasks documents, external-record templates, workflow prompts,
snippets, and fragment boilerplate.

The only initialization template is `.relic/RELIC.md`, containing the structured Relic
corpus topology and minimal current-corpus ID allocation instruction.

The topology defines only Relic corpus roots. It contains no canonical project-governance
roles, filenames, or responsibility taxonomy.

The semantic component reference belongs to the central skill and frontend distribution.
It is not copied into every specification and does not impose fixed document sections.

## Packaging and CI

### Keep or adapt

- Adapt the npm bundle to ship the four-command CLI, central skill, and viewer assets.
- Keep or adapt the PyPI wrappers and platform binaries.
- Keep or adapt viewer embedding and shebang correction.
- Adapt `publish.ts` without plugin-version or marketplace behavior.
- Adapt npm, PyPI, tag, and test workflows to the 2.0 artifacts.

### Remove or replace

- Remove plugin build and publication steps.
- Remove engine-template embedding.
- Replace template-oriented build assertions with 2.0 initialization and skill-package
  assertions.

npm and PyPI remain delivery channels for now. Stage 6 may reduce them only when
distribution evidence shows that a channel no longer earns its maintenance cost.

## Tests

### Retain as evidence or adapt

- filesystem traversal and root-discovery behavior;
- tolerant parser behavior;
- read-only server, localhost, app-shell, asset, and SPA behavior;
- engine-installation idempotency;
- flow, chart, callout, chip, and safe presentation behavior;
- multi-platform packaging.

### Replace

- `init`, configuration, search, fragment, `view-data`, `serve`, API, and engine tests
  with fixtures that exercise the accepted 2.0 contracts.

### Remove

- tests for sessions, spec-ID scanning, ownership/intersection, artifact manifests,
  changelogs, scaffolding, standalone validation, TOON, structured writes, external
  context, upgrade, active context/fix/use behavior, plugin manifests, and migrations
  between 1.x modes.

### Required 2.0 fixture coverage

- structured topology and next-ID derivation from current canonical identities;
- canonical `RELIC.md`, shared/FR/NFR/ADR/EPIC Markdown, and spec `index.html`;
- searchable but non-canonical specification artifacts;
- overlapping-root deduplication with multiple memberships;
- ordinary relative links, derived backlinks, orphans, duplicates, and broken-link
  diagnostics;
- tolerant HTML and Markdown rendering;
- real-path containment, symlink escape rejection, safe URL handling, and active-content
  removal;
- central-skill installation for supported engines;
- read-only search and frontend behavior.

## Baseline Evidence

At the time of this inventory:

- `bun run typecheck` passes;
- the full `bun test` run reports 246 passing tests, one failure, and one error across
  503 assertions;
- the isolated `packages/core/src/__tests__/serve.test.ts` failure reproduces under Bun
  1.3.14 when `server.listen(0)` cannot start, followed by the hook timeout.

This baseline prevents existing green behavior from being overstated and gives later
replacement work a comparison point. It does not make 1.x tests acceptance criteria
for 2.0 behavior.

## Applying the Inventory

This document directs staged replacement; it does not authorize indiscriminate deletion
before the corresponding 2.0 gate is green. During each work stage:

1. begin from the accepted 2.0 contract and its fixture;
2. retain an **adapt** candidate only after focused evidence proves its boundary;
3. otherwise remove the candidate and implement the smallest clean 2.0 behavior;
4. delete obsolete 1.x machinery once its replacement gate protects the retained
   capability;
5. keep the current `.relic/` tree unchanged until the self-hosting stage.

The goal is not a gradual mutation of Relic 1.x. It is a clean Relic 2.0 whose few reused
parts have earned their place.
