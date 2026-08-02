# Changelog

All notable changes to `relic-cli` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Canonical Markdown now supports the same allowlisted semantic HTML vocabulary as
  specification HTML, so authored disclosures such as `<details>` render as structure
  instead of literal markup. Unbalanced blocks are paired back together and the Markdown
  between them is nested inside the element.
- Recursive, shape-aware rendering of project metadata: scalar collections use the
  viewer's existing chips, while nested objects and arrays remain readable key-value
  structures without assigning meaning to project-defined fields.

### Changed
- HTML anchors authored in Markdown are ordinary knowledge links, so they now create
  graph edges, backlinks, and broken-link diagnostics like their Markdown equivalents.
- Markdown search text derives from the sanitized document AST, so removed markup and
  unsafe content no longer reach the index.

### Removed
- The blanket `markdown-raw-html` diagnostic, replaced by the vocabulary's precise
  `unsafe-html`, `unsupported-html`, `unsafe-html-attribute`, and `unbalanced-html`
  evidence.

## [2.0.1] — 2026-07-31

### Added
- Project-declared Markdown record kinds whose uppercase numbered identity prefixes
  derive directly from the lowercase keys in `topology.records`.
- Conventional business-rule (`BR`) and glossary (`GL`) record definitions, topology
  defaults, search coverage, and distribution fixtures.

### Changed
- Replaced the core's closed FR/NFR/ADR/EPIC record taxonomy with an open topology map;
  projects may add or omit every individual record kind without changing Relic.
- Updated the central skill and self-hosted knowledge to treat record definitions,
  authorship, and lifecycle as project-owned governance.

## [2.0.0] — 2026-07-31

### Added
- Relic 2.0 knowledge model with root `relic.yaml` as topology-only authority,
  living Markdown records, typed specification HTML, shared knowledge,
  repository-relative links, repository-contained submodule roots, derived
  diagnostics, and searchable specification artifacts.
- One central, portable Relic skill installed into the native project-local
  skill directories of Claude, Codex, and GitHub Copilot.
- Embedded read-only React viewer with an exhaustive catalog, document and
  artifact views, maintenance evidence, semantic charts and flows, safe
  artifact downloads, and a derived in-memory read cache.
- Native Python wheels for Linux x64/arm64, macOS x64/arm64, and Windows x64,
  with platform metadata and native smoke tests for every published target.
- A self-hosted Relic 2.0 corpus with one canonical product specification,
  linked shared knowledge, FRs, NFRs, ADRs, and a release EPIC.
- Product-specific contribution and security guidance.

### Changed
- Reduced the public CLI to `init`, `install`, `search`, and `serve`.
- Made `relic init` create only `relic.yaml`; `.relic/` is now an optional
  topology convention rather than product-owned structure.
- Replaced configuration, counters, locks, modes, prescribed search behavior,
  and the rigid `specify → clarify → plan → tasks` workflow with current
  repository evidence and agent-owned exploration.
- Made code authoritative for implemented behavior while keeping Relic records
  focused on the current requirements, decisions, boundaries, and intent.
- Made release targets explicit in release branch and tag names, pinned build
  dependencies and GitHub Actions, and adopted tokenless PyPI publishing.
- Made public typecheck and test scripts regenerate ignored distribution assets
  so clean checkouts do not depend on a prior manual build.
- Made engine-skill refresh preserve or recover the previous installation and
  hardened distribution-test cleanup and viewer shutdown.

### Removed
- Relic 1.x lifecycle commands, templates, session machinery, validation
  command, plugin/MCP orchestration, HTML mode selection, and persistent
  configuration state.
- The self-hosted Relic 1.x corpus, transitional architecture/work-order
  documents, and the separate architecture-roast and requirement-record skills
  after their behavior was absorbed into the central Relic skill.

## [0.9.0] — 2026-07-16

### Added
- **Claude Code plugin (`relic@relic`)** — the relic repo doubles as a plugin
  marketplace. Ships the 12 workflow commands (as `/relic:<name>`), the `/relic:setup`
  onboarding command (consent-gated CLI install + `relic init`), and four ambient
  skills that make SDD the default working practice: `relic-knowledge-first`,
  `relic-spec-detector`, `relic-fix-pipeline`, `relic-doc-keeper`. Per-project
  installation via committed `.claude/settings.json` (marketplace + `enabledPlugins`).
- **Ambient SDD autonomy ladder** — read silent / maintain automatic / structural
  announce-then-do, governed by the new `config.json` `"sdd"` knob (`auto` default,
  `suggest` for ask-first teams); exposed in `relic context`.
- **Spec viewer** — `relic serve` starts a per-project, read-only localhost server
  with an embedded React app: project dashboard, spec views (live derived task
  progress, artifact tables, changelog), fix views, markdown tabs rendered from disk,
  and a `/docs` tag reference. Port via `config.json` `viewer.port` (default 4747,
  same-project reuse, auto-increment).
- **MCP server** — `relic mcp` (stdio; zero dependencies) with `view_spec`,
  `view_fix`, and `list_views` tools that ensure the viewer is running and return
  URLs; wired into the plugin via `.mcp.json`.
- **Fragment format for spec/fix HTML** — files are now minimal `<relic-body>`
  fragments of semantic tags; derived tags (`<relic-spec-meta/>`, `<relic-tasks/>`,
  `<relic-artifacts/>`, `<relic-changelog/>`) are computed server-side from the real
  files and can never go stale. `relic validate` lints fragments; malformed tags
  degrade to inline warnings instead of breaking pages.
- **`relic viewer-migrate`** — converts pre-fragment full-document HTML files;
  also run automatically by `relic upgrade`.
- **External spec integration (spec 009)** — `config.json` `external` per-type path
  map (`fr`/`nfr`/`br`/`adr`/`us`/`epic`, typically a git-submodule spec repo);
  `relic external` command (`init` submodule, `set`, `link`, `create` with sequential
  IDs + auto git commit + auto-link, `list`); `external_reads` in `artifacts.json`;
  hard validate errors on broken entries; `relic init --external-<type>` flags; six
  document templates; workflow prompts read linked documents before working.
- **Prompt snippet injection (spec 010)** — `<!-- include: relic snippet <name> -->`
  directives resolved at runtime via the new `relic snippet` command; shared prompt
  fragments live once in `templates/snippets/`.
- **`relic upgrade --clean`** — removes superseded pre-plugin
  `.claude/commands/relic.*.md` copies (relic-managed pattern only, each reported).

### Changed
- **Command spelling** — `/relic.command` is now `/relic:command` everywhere (plugin
  namespace form; single spelling, no compatibility period).
- **Claude engine** — `relic init --engine claude` / `add-engine claude` write the
  per-project plugin installation (permission + marketplace + enablement) instead of
  copying 12 command files into the project.
- **Preamble** — spec-folder file allowlist is mode-conditional (4 files, plus the
  CLI-created `<spec-id>.html` in html mode); new Ambient SDD section documents the
  autonomy ladder for all engines.
- **`relic mode html`** — no longer writes `.relic/base.html`; fragments need no
  per-project chrome.
- **`relic context`** — output gains `sdd`, `viewer` (`{running, port, url}`), and
  `external`/`external_reads` fields.

### Fixed
- **HTML components broke pages** — custom-element parse-timing bug (flows rendered
  from empty sources and dumped raw text), `</script` truncation in embedded reader
  sources, and the docs `<template>` swallowing the component script (blank pages);
  fixed in 0.9-era chrome, then the whole chrome model was superseded by the viewer.
- **Flow diagrams** — edge operator no longer matches inside node labels
  (`A[foo---bar]`); undirected `A --- B` edges now render.
- **`relic validate`** — permits `<spec-id>.html` in html mode spec folders.
- **`relic upgrade --prompts`** — now works in dev-channel builds (was unreachable
  behind the channel warning).
- **Tooling** — root `bun test` no longer fails from a process-global
  `mock.module` leak; all 16 legacy typecheck errors fixed; `tsc --noEmit`, plugin
  freshness, and viewer embed run in CI.
- **Pre-1.0 review sweep** — `/relic:fix` html-mode step authored fragments again
  (was still instructing a copy of the retired `base.html`); viewer markdown links
  are scheme-filtered and quote-escaped; task parsing tolerates CRLF files (Windows
  checkouts reported wrong counts); `relic validate`, `relic external list`,
  `relic upgrade`, and `add-engine claude` report unreadable/malformed inputs and
  network failures as errors instead of crashing (an unparseable
  `.claude/settings.json` is never overwritten); viewer markdown handles nested
  lists, nested/multi-line emphasis; charts clamp non-numeric/negative data; the
  fragment parser drops a dangling quote from unclosed attribute values.
- **Viewer dogfooding trio** — markdown tabs no longer freeze on paragraph lines
  starting with inline code (renderer infinite loop); concurrent MCP tool calls no
  longer spawn duplicate viewer servers (`ensureServer` serialized); `relic context`
  finds a viewer running on an auto-incremented port (probes the `viewer.json`
  runtime port before the configured one).

### Removed
- **`relic html-sync`** — retired; there is no per-file chrome to sync. Legacy files
  are converted by `relic viewer-migrate`.
- **`.relic/base.html`** — removed by `relic upgrade` (superseded by the embedded
  viewer).

---

## [0.8.19] — 2026-05-20

### Added
- **Inline markdown reader for HTML spec navigation** — header links now render
  `spec.md` / `plan.md` / `tasks.md` inside the HTML view using embedded source
  blocks (with a fetch fallback), plus a back button to restore the main view.

### Changed
- **HTML base design system overhaul** — dark mode toggle with CSS custom
  properties + persistence, sticky header layout, new `<relic-chip>` component,
  component docs moved into `<template id="relic-docs">`, improved typography and
  table striping.

### Fixed
- **`relic use --fix` respects html mode** — fix files now resolve to `.html`
  when `mode = "html"` instead of being hardcoded to `.md`.

---

## [0.8.18] — 2026-05-20

### Fixed
- **HTML workflow files remained empty after every session** — the HTML step in all
  seven prompt templates (`specify`, `clarify`, `plan`, `tasks`, `implement`, `fix`,
  `solve`) was appended after the terminal "When done, confirm" / "Report to the user"
  section. AI agents stopped at the checklist and never reached the HTML step. Fixed
  by moving the HTML step before the confirm section in all five spec templates and
  integrating it into the step sequence in `fix` and `solve`.
- **`/relic.fix` created `.md` files in html mode** — the mode check was at the end
  of the template, after the fix document was already written as `.md`. `fix.md` now
  checks mode in **Step 0** (before anything else) and commits the correct file path
  (`.html` or `.md`) for the entire session. Step 5 branches on that decision. The
  same mode-conditional logic was applied to `solve.md` (Steps 1, 2, and 7).

---

## [0.8.17] — 2026-05-20

### Added
- **HTML spec mode** (`relic mode html`) — projects can now switch between Markdown
  and HTML output modes. In HTML mode, `relic scaffold` creates a self-contained
  `<spec-id>.html` file alongside the standard `spec.md`/`plan.md`/`tasks.md`, giving
  AI agents a richer canvas to populate with charts, flow diagrams, tables, and status
  badges via `<relic-*>` custom components.
- **`relic mode [md|html]`** — new CLI command. No argument reads the current mode;
  with an argument sets it and (on first switch to `html`) scaffolds `.relic/base.html`,
  the self-contained component library.
- **`templates/base.html`** — embedded component library: utility CSS, and six custom
  elements (`<relic-chart>` bar/pie/line, `<relic-flow>` flowchart renderer,
  `<relic-status>` badge, `<relic-table>` JSON table, `<relic-callout>` info/warn/risk,
  `<relic-progress>` bar). All JS and CSS are inline — works offline.
- **`mode` field in `relic context` output** — AI workflow commands can check the active
  mode without reading `config.json` directly.
- **Conditional HTML step in all seven prompt templates** — when `mode = "html"`, each
  workflow command (`specify`, `clarify`, `plan`, `tasks`, `implement`, `fix`, `solve`)
  reads and updates the spec/fix HTML file with enriched content and component calls.

### Changed
- **`.relic/engines.json` → `.relic/config.json`** — project config migrated to a new
  file with shape `{ "engines": [...], "mode": "md" }`. Silent auto-migration on first
  read: if only `engines.json` exists, it is converted and removed automatically.
- **`relic init` always writes `config.json`** — even when no `--engine` flag is passed,
  ensuring the file is present for teams to inspect from day one.

### Fixed
- `relic upgrade` warning now reads "missing or empty" to accurately cover the case
  where `config.json` doesn't exist yet (not just where it exists but has no engines).

---

## [0.8.16] — 2026-05-20

### Added
- `/relic.ask` — a new read-only slash command that queries the full Relic knowledge
  base (shared artifacts, specs, and fix documents) and answers natural-language
  questions in the terminal without creating or modifying any file. Use it to check
  ownership, find existing contracts, or inspect assumptions before committing to a
  workflow command like `/relic.specify` or `/relic.clarify`.
- `relic ask` stub registered in the debug binary (`bin.debug.ts`).

### Removed
- Reverted spec 007-remote-ollama-engine and all associated code (direct model
  invocation via OpenAI-compatible API). Pure model invocation without an agentic
  runtime delivers no value — workflow commands need an agent to execute them.
  Removed: `model-client.ts`, `model-runner.ts`, `history-compressor.ts`,
  `model-config.ts`, `solve.ts`, `constitution.ts`, and their tests. Restored
  `bin.debug.ts` (deleted by the reverted spec).

---

## [0.8.15] — 2026-05-09

### Fixed
- `relic upgrade` was broken on every npm-installed binary: the running version was
  always reported as `0.8.0`, and the install channel was never detected (`channel:
  "dev"`). Two independent build-pipeline bugs were responsible.
  - `scripts/publish.ts` bumped the CLI version with a regex matching
    `.version("X.Y.Z")`, but `packages/cli-node/src/bin.ts` was refactored to read
    `const VERSION = "..."` and pass it to `.version(VERSION)`. The regex stopped
    matching, freezing the embedded version constant at `0.8.0` for every release
    since the refactor. The regex now targets `const VERSION = "..."` directly.
  - The repo-root `package.json` `build:npm` and `build:binary` scripts (used by
    `publish-npm.yml`) were missing `--define 'INSTALL_CHANNEL="npm"'`. The five
    `build:pypi:*` scripts likewise lacked the pypi define, so local PyPI builds
    produced `"dev"` binaries. All seven scripts now embed their channel
    explicitly, so `INSTALL_CHANNEL` cannot drift between local and CI builds.

### Changed
- `.github/workflows/publish-pypi.yml` now invokes `bun run build:pypi:<target>`
  instead of duplicating the `bun build --compile` invocation. Channel embedding
  lives in one place (the script). Matrix `bun_target` field renamed to
  `script_target`; the now-redundant "Embed templates" workflow step was dropped
  (the build script already chains `build:templates`).
- Removed dead `build:binary` and `build:npm` scripts from
  `packages/cli-node/package.json`. CI never invoked them — they were a footgun
  that obscured the actual build commands in the repo-root `package.json`.

### Upgrade note
Existing 0.8.x npm installs will keep self-reporting as `0.8.0` until users
reinstall once: `npm install -g relic-cli@latest` (or
`uv tool upgrade relic-cli` / `pip install --upgrade relic-cli`). After that,
`relic upgrade --check` reports the correct current version and channel.

---

## [0.8.2] — 2026-04-20

### Fixed
- `models.json` numeric fields (`maxHistoryMessages`, `recentFullMessages`, `timeoutMs`) now
  validated on load. Negative values, non-integers, zero timeouts, and incoherent combinations
  (`recentFullMessages > maxHistoryMessages`) all produce actionable errors naming the field,
  its invalid value, the constraint, and the config path — then exit non-zero. Previously these
  were accepted silently and corrupted history trimming behaviour.
- Config parsing extracted to `parseModelConfig()` in `@relic/utility`, paralleling
  `resolveSpec()`. `ModelConfig` type moved to `@relic/utility` as the single source of truth
  for all consumers.
- `relic specify` and `relic fix` now error consistently when `.relic/models.json` is absent,
  matching every other workflow command. Previously both had silent fallbacks (print guidance /
  print context to stdout) that contradicted the documented behaviour.
- `scripts/publish.ts` no longer references the deleted `bin.debug.ts`. Version bump now covers
  exactly 5 files as documented.
- Root `package.json` `dev:debug` and `build:binary:debug` scripts removed — both targeted the
  deleted debug binary and would fail if invoked.
- `relic specify --spec <id>` option removed — the flag was registered but silently ignored.

### Changed
- Spec and fix resolution centralised into `resolveSpec()` and `resolveFix()` in `@relic/utility`.
  All workflow commands now use the same five-step chain:
  `--spec arg → active fix owning spec → RELIC_SPEC env → session.json → git branch inference`.
  Previously the chain was copy-pasted across 8+ command files with no shared implementation.
- `relic model --reset-context` now uses the full five-step resolution chain. Previously it
  skipped the `RELIC_SPEC` env var, active-fix, and git branch inference steps.
- `relic clarify`, `relic analyse`, and other fix-aware commands now automatically use the fix's
  owning spec when a fix is active (`session.fix` is set), without requiring the user to also
  set `session.spec` separately.

### Infrastructure
- Release flow: `bun run publish` now pushes only the release branch. The `vX.Y.Z` tag is
  created automatically after the PR merges to `main` via the new `tag-release.yml` workflow.
  Publish CI can no longer fire before doc-guard has passed.
- GitHub Copilot workspace instructions (`.github/copilot-instructions.md`) added — scopes
  reviews to application code and enforces a 7-point checklist covering version sync, changelog
  completeness, README drift, template/generated sync, intersection safety, self-hosting
  coherence, and path security.
- Doc Guard CI (`doc-guard.yml`) added — detects version bumps on PRs, verifies a matching
  `## [X.Y.Z]` entry in `CHANGELOG.md`, warns on untouched `README.md`, and blocks merge on
  missing changelog entries.

---

## [0.8.0] — 2026-04-18

### Added
- **Direct model invocation** — workflow commands (`specify`, `clarify`, `plan`, `analyse`,
  `tasks`, `implement`, `fix`, `solve`, `constitution`) are now first-class production CLI
  commands. When `.relic/models.json` is present, each command assembles spec context, loads
  its prompt template, and calls any OpenAI-compatible API endpoint directly — no IDE required.
  Primary target: Ollama running locally or on a remote machine via SSH port forwarding.
- `relic specify / clarify / plan / analyse / tasks / implement / fix` — all workflow commands
  added to the production binary. Each accepts `--spec <id>`, `--no-stream`, and `--reset-context`.
- `relic solve [--fix <id>] [--no-stream]` — apply the active fix document via model call.
- `relic constitution [--no-stream]` — regenerate `.relic/constitution.md` from the codebase.
- `relic model --reset-context [--spec <id>]` — clear per-spec conversation history.
- `relic scan` default inverted — `relic scan` now runs the AI workflow by default, matching
  `/relic.scan` in the IDE. `--manifest` flag (and `--manifest --json`) preserve the previous
  manifest-only output. `--json` alone treated as `--manifest --json` for backward compatibility.
- **Conversation history** — persisted per-spec at `.relic/specs/<spec-id>/history.json`
  (gitignored). Subsequent commands within a spec retain reasoning continuity.
- **Structural history compression** — messages older than `recentFullMessages` (default: 2)
  are compressed deterministically: headings and bullets kept, prose truncated to first sentence,
  code blocks dropped. No model calls, no cost.
- `models.json` config: `baseUrl`, `model`, `apiKey?`, `maxHistoryMessages?` (default 20),
  `recentFullMessages?` (default 2), `timeoutMs?` (default 300,000ms / 5 min).
- Env var overrides: `RELIC_MODEL_BASE_URL`, `RELIC_MODEL_MODEL`, `RELIC_MODEL_API_KEY` — enable
  CI usage without committed credentials.
- `getPromptTemplate(name)` export added to `@relic/engines` — surfaces `ENGINE_TEMPLATES` for
  use by the model runner.
- `relic init` now writes all three gitignore entries: `session.json`, `models.json`,
  `specs/**/history.json`.

### Changed
- Single production binary — `bin.debug.ts` deleted; all commands live in `bin.ts`. One system
  to understand and maintain.
- `fetchWithTimeout` in `@relic/utility` now accepts an optional `RequestInit` parameter,
  enabling POST requests with headers and body.
- `preamble.md` (template and installed copy) updated: spec directories now officially allow
  five files (`spec.md`, `plan.md`, `tasks.md`, `artifacts.json`, `history.json`).
- `relic validate` allows `history.json` in spec directories (session-local, not a content check).

### Fixed
- `relic init` was writing only `session.json` to `.relic/.gitignore`, omitting `models.json`
  and `specs/**/history.json`. New projects now receive all three entries on init.

---

## [0.7.0] — 2026-04-15

### Added
- **Toon manifest format** — `shared/*/manifest.toon` replaces `manifest.json` as the default
  index format. Toon is a compact, pipe-delimited line format optimised for LLM consumption:
  one entry per line, no JSON overhead, scannable without parsing.
- `relic toon-migrate` — convert existing `shared/*/manifest.json` files to `manifest.toon`;
  rebuild the spec and fix indexes in the new format.
- `relic search` and `relic deep-search` now output toon lines by default (Constitution
  amendment: toon is the enforced default for all list-returning LLM-facing commands).
  `--json` flag available for machine consumers.

### Changed
- `relic validate` prefers `manifest.toon` over `manifest.json`; warns and falls back when
  only `manifest.json` is present.
- `relic search` `--knowledge`, `--spec`, `--fix` scope flags now work against the toon indexes.

---

## [0.6.4] — 2026-04-14

### Fixed
- `relic add-engine copilot` now writes individual `.github/prompts/relic.<name>.prompt.md`
  files (one per command, with YAML frontmatter `description: Relic <name> command`) instead
  of a single `.github/copilot-instructions.md`. These appear as native slash commands in
  Copilot Chat (type `/` to pick from the list).
- `relic add-engine codex` now writes individual `.codex/commands/relic.<name>.md` files
  (one per command, prompt body written directly) instead of a single `.codex/instructions.md`.
  These appear as native slash commands in Codex.
- Both Copilot and Codex engines now include the `/relic.solve` command (11 commands total,
  in parity with Claude Code).

---

## [0.6.0] — 2026-04-13

### Added
- `relic upgrade [--check] [--prompts] [--text]` — upgrade the `relic-cli` binary and refresh
  AI engine hook files. `--check` reports available updates without installing. `--prompts`
  refreshes hook files only (skips binary upgrade). `--text` for human-readable output.

---

## [0.5.0] — 2026-04-13

### Added
- **Two-stage fix pipeline** — `/relic.fix` (diagnosis) + `/relic.solve` (application).
  `/relic.fix` identifies the owning spec, classifies the root cause, and writes a fix document
  to `.relic/fixes/<fix-id>.md`. `/relic.solve` applies code changes, updates the knowledge
  layer if contracts changed, and closes the fix.
- `session.json` replaces `.relic/current-spec` as the session state file. Carries both
  `session.spec` and `session.fix`, enabling the two-stage fix pipeline.
- `relic use --fix <fix-id>` — set the active fix (validates the fix document exists).
- `relic use --clear-fix` — clear the active fix from session state.
- `relic context` now reports `current_fix` alongside the active spec.
- `.relic/fixes/` directory and `fixes/manifest.toon` index created by `relic init`.
- Fix ID format: `YYYY-MM-DD-<slug>` (e.g. `2026-04-13-null-session-read-on-missing-file`).

---

## [0.4.0] — 2026-04-13

### Added
- `@relic/utility` (`packages/utility/`) — new shared utility package exporting `fs.ts`
  and `spec-id.ts`. Dependency floor for the monorepo; no Relic package dependencies.
- `@relic/engines` (`packages/engines/`) — new dedicated engine management package owning
  all write logic for Claude, Copilot, and Codex. Depends on `@relic/utility` only.
- `relic add-engine claude` now writes `.claude/settings.json` with
  `{ "permissions": { "allow": ["Bash(relic *)"] } }` — committed permission config
  eliminates interactive approval prompts for all `relic *` commands in Claude Code.
  Merge is idempotent; calling `add-engine` twice keeps exactly one entry.
- `relic add-engine codex` now writes `.codex/config.toml` with
  `prefix_rules = [{ pattern = ["relic"], decision = "allow" }]`.
  Idempotent — skipped if `["relic"]` already present.

### Changed
- Copilot and Codex outputs are now generated at runtime from `ENGINE_TEMPLATES` (sourced
  from `templates/prompts/`). A prompt change in `templates/prompts/` propagates to all
  three engines automatically on the next build. (Note: the per-command file format shipped
  in the Unreleased fix above; this release shipped the template pipeline that enables it.)
- `build:templates` now runs `build:engine-templates` first (generates `ENGINE_TEMPLATES` in
  `packages/engines/src/generated/`) before the core scaffold template embed step.
- `packages/core` imports `fs.ts` and `spec-id.ts` utilities from `@relic/utility`;
  imports `runAddEngine` from `@relic/engines`. Public API of `@relic/core` is unchanged.

### Removed
- `templates/engines/` deleted — `templates/prompts/` is now the sole source of truth
  for all prompt content. No more duplicate maintenance for Copilot and Codex.
- `packages/core/src/commands/add-engine.ts` removed; logic moved to `@relic/engines`.
- `packages/core/src/utils/fs.ts` and `packages/core/src/utils/spec-id.ts` removed;
  moved to `packages/utility/src/`.

---

## [0.3.0] — 2026-04-12

### Added
- `relic search <keywords...>` — search shared artifact manifests by keyword tags.
  Loads all `shared/*/manifest.json` files and returns scored candidates where any
  tag matches a keyword (case-insensitive substring). Returns JSON array sorted
  by score descending; returns `[]` if no matches. Errors if no keywords given.
- `relic deep-search` — return all manifest entries consolidated across every
  `shared/` subdirectory. LLM is instructed to read `tldr` fields only and load
  full artifact files selectively. Use as a fallback when `relic search` returns
  insufficient results.
- `manifest.json` per `shared/<subdir>/` — flat JSON index that every artifact file
  must register in. Schema: `[{ name, file, tldr, tags }]`. The `preamble.md`
  now mandates this as an invariant.
- `relic validate` extended with two new checks:
  - `missing_manifests` — a `shared/` subdirectory has `.md` files but no `manifest.json`
  - `unregistered_files` — a `.md` file is not listed in its subdirectory's manifest
- `templates/prompts/scan.md` — new Step 8: register every produced artifact in its
  manifest before the changelog step.
- Two-step discovery cascade in `specify` and `plan` prompts: extract up to 10 keywords
  from the user's input → `relic search` first; fall back to `relic deep-search` only
  if results are insufficient.

---

## [0.2.1] — 2026-04-11

### Fixed
- `relic init` no longer creates `.relic/prompts/` — prompt files already live in
  engine-specific hook directories (`.claude/commands/`, `.github/`, `.codex/`).
  The copy in `.relic/prompts/` was redundant. Existing projects can safely delete
  that folder.

---

## [0.2.0] — 2026-04-11

### Added
- `relic context [--spec <id>] [--text]` — resolve the active spec and report file
  existence and shared artifact references. Replaces `check-context.sh`. JSON by default;
  `--text` for human-readable output. Errors with a `relic scaffold` hint if the spec
  directory does not exist.
- `relic scaffold [--title <title>] [--spec <id>]` — ensure a spec folder exists; create
  it from templates if new. Replaces `scaffold-spec.sh`. `--title` generates a new spec ID;
  `--spec` resolves an existing one. Errors if both flags are passed simultaneously.
  Writes `.relic/current-spec` on success.
- `relic validate [--text]` — check artifact integrity and ownership conflicts across all
  specs. Replaces `validate-artifacts.sh`. JSON by default; `--text` for human-readable
  output. Checks: ownership conflicts, missing owned/read artifacts, illegal spec-dir
  files, and invalid paths (must start with `shared/`).

### Changed
- `relic init` no longer writes `.relic/scripts/` or `.relic/templates/` — all helpers
  are now first-class CLI commands; no bash or Python dependency in user projects.
- All AI prompt templates and engine instructions (`copilot-instructions.md`,
  `instructions.md`) updated to call `relic context`, `relic scaffold`, and `relic validate`
  directly instead of `bash .relic/scripts/*.sh`.

### Removed
- Bash utility scripts (`check-context.sh`, `scaffold-spec.sh`, `validate-artifacts.sh`,
  `common.sh`) removed from the template set. Existing projects that still have
  `.relic/scripts/` can delete that folder — it is no longer used or written.

---

## [0.1.1] — 2026-04-11

### Fixed
- **BREAKING install fix**: removed `@relic/core: workspace:*` and `commander` from
  `dependencies` — both are bundled into `dist/relic.js` at build time. All users were
  getting `EUNSUPPORTEDPROTOCOL` on `npm install`.
- Stripped Bun shebang (`#!/usr/bin/env bun` / `// @bun`) from `dist/relic.js` via
  post-build script — tools that inspect shebangs were treating this as a Bun package.
- Replaced `prompt()` (Bun/browser global) in `specify.ts` with Node.js `readline` —
  `prompt()` throws `ReferenceError` in Node.js.
- Added `shared/` prefix guard in `context-builder.ts` to prevent path traversal via
  crafted `artifacts.json` entries.
- Fixed `sed` injection in `scaffold-spec.sh`: spec titles containing `&` or `\` were
  silently corrupting template files during substitution.
- Fixed arg parsing in `check-context.sh`: `shift` inside a `for..in` loop is a no-op;
  replaced with `while/shift` pattern.
- Moved `@types/node` from `dependencies` to `devDependencies` in workspace root.

### Added
- `LICENSE` file (MIT).
- `scripts/fix-shebang.mjs` — post-build step that strips Bun markers from the Node.js bundle.

---

## [0.1.0] — 2026-04-10

Initial MVP release.

### Added
- `relic init [--engine claude|copilot|codex] [--dir] [--force]` — scaffold `.relic/`
  into any project. Writes preamble, constitution, changelog, shared brain directories,
  bash utility scripts, and AI engine hook files.
- `relic add-engine <claude|copilot|codex>` — add AI engine hooks to an existing project.
- `relic use <spec-id>` — set the active spec by writing `.relic/current-spec`.
- `relic scan [--json]` — walk the project and output a structured manifest (tech stack,
  key files, file tree, existing artifacts) for the `/relic.scan` AI workflow.
- **10 AI slash commands** written to engine hook directories:
  `/relic.specify`, `/relic.clarify`, `/relic.plan`, `/relic.analyse`, `/relic.tasks`,
  `/relic.implement`, `/relic.fix`, `/relic.use`, `/relic.scan`, `/relic.constitution`
- **Claude Code** hooks: `.claude/commands/relic.*.md` (one file per command)
- **GitHub Copilot** hooks: `.github/copilot-instructions.md`
- **Codex** hooks: `.codex/instructions.md`
- `preamble.md` — Relic's immutable structural and operational rules
- `constitution.md` — project-specific template with principles, tech stack, testing
  standards, architecture, workflow, and governance sections
- `scaffold-spec.sh` — ensures spec folders exist before AI acts; creates from templates;
  writes `.relic/current-spec`
- `check-context.sh` — resolves active spec and outputs structured JSON context
- `validate-artifacts.sh` — checks artifact integrity and ownership conflicts
- Active spec tracking via `.relic/current-spec` (gitignored); resolution order:
  `--spec arg` → `RELIC_SPEC` env → `current-spec` file → git branch → error
- Cross-platform Node.js bundle via `bun build --target node` (no Bun runtime required)
