# Relic 2.0 — Ordered Work Program

> **Status:** proposed execution order, 2026-07-29
> **Source:** [`relic-2.0.md`](relic-2.0.md)

This document orders the design and implementation of Relic 2.0. It is not the old
specify → plan → tasks workflow under a new name. Each stage exists because its outputs
are dependencies of the next stage, and each gate prevents the existing implementation
from dictating unresolved product contracts.

## Execution Rules

- Complete stages in order. Do not begin a dependent stage while its gate is open.
- Preserve the working Relic 1.x implementation until a Relic 2.0 read-only vertical
  slice proves the replacement foundations.
- Give Relic 1.x code no presumption of reuse. Reuse code only after positive evidence
  shows that it serves the 2.0 contract without retaining a 1.x workflow assumption.
  When the evidence leaves a choice between adapting and removing, remove and rebuild
  cleanly from the accepted contracts.
- Keep product contracts, implementation, and retirement decisions auditable in separate
  changes.
- Validate each stage with focused tests before expanding the surface.
- Do not create backward-compatibility machinery. Migrate this repository deliberately
  after the new model works.
- Treat this repository's current `.relic/` tree as Relic 1.x evidence throughout Stages
  1–7. Do not convert it incrementally, use it as the 2.0 acceptance fixture, or require
  it to satisfy contracts that the operational 2.0 product cannot yet enforce.
- Prove 2.0 with isolated fixtures and a disposable pilot first. Self-hosting begins only
  after the read model, search, frontend, central skill, CLI, distribution, and 1.x
  retirement gates are green together.

## 1. Close the Relic 2.0 Contracts

Define the smallest deterministic contracts needed by skills, CLI, search, and frontend:

- `.relic/RELIC.md`: structured topology, project-owned Relic corpus roots, and
  free-form agent guidance without a project-governance schema;
- no second project configuration file, persisted ID counter, or declared engine list;
- document identity, optional project metadata, and living-record mutation freedom;
- references, backlinks, and relationship resolution without exclusive ownership;
- canonical spec HTML and the supported semantic component vocabulary;
- search corpus, indexing, freshness, and behavior when metadata is incomplete;
- central Relic skill reasoning behavior, authorization boundary, and completion
  criteria;
- the minimal CLI capabilities required by those contracts;
- the frontend's read model and its authority boundaries.

The `RELIC.md` topology contract is accepted in
[`relic-2.0.md`](relic-2.0.md#project-file-contract). Every declared corpus root is
project-owned and configurable; `.relic/specs/` and `.relic/shared/` are defaults. Relic
defines no canonical project-governance roles or filenames. Current canonical identities
derive the next numbered value, and project-local engine paths are the complete
installation state. The schema and failure behavior are inputs to the remaining Stage 1
contracts rather than open topology decisions.

Document identity, native metadata scope, opaque project fields, and mutation freedom are
accepted in [`relic-2.0.md`](relic-2.0.md#document-identity-and-mutation-contract). The
current `requirement-records` skill and generator script are classified **remove/absorb**:
they remain design evidence, while the central skill follows the topology, derives the
next free value from current canonical identities, and writes requested records directly.

Ordinary relative-path web edges, derived backlinks, broken-link maintenance evidence,
and optional ID reconciliation are accepted in
[`relic-2.0.md`](relic-2.0.md#relationship-and-backlink-contract). The current
`artifacts.json`, `owns`, `reads`, `touches_files`, ownership intersection, and manually
maintained relation-index machinery are classified **remove**. Existing Markdown and HTML
link parsing and frontend navigation are classified **adapt**; custom link protocols and
ID-to-path resolution are excluded.

Exhaustive catalog, full-text discovery, multiple corpus memberships, orphan visibility,
deterministic display fallbacks, and derived-cache authority boundaries are accepted in
[`relic-2.0.md`](relic-2.0.md#consultability-contract). The current manifest-based search
and spec/session-oriented `view-data` read model are classified **replace**. Reusable
presentation components may still be classified **adapt** after satisfying the accepted
[`semantic HTML contract`](relic-2.0.md#semantic-html-contract).

The canonical `index.html` specification fragment, native-first authoring vocabulary,
minimal progressive component set, tolerant allowlisted rendering, real-path containment,
and frontend authority boundary are accepted in the semantic HTML contract. The single
`relic-body` root, tolerant diagnostics, callouts, textual flows, and presentation
components whose knowledge remains in child content are classified **adapt**.
JSON-attribute tables and charts, derived spec metadata, tasks, artifacts, changelog
components, interpreted status vocabulary, fixed specification sections, embedded
chrome, raw browser HTML injection, and dual-format synchronization are classified
**remove/replace**.

The central skill's generic reasoning protocol, proportional depth, progressive context
discovery, recommendation-first behavior, persistence boundary, temporary decision
ledger, and objective stopping condition are accepted in
[`relic-2.0.md`](relic-2.0.md#central-skill-contract). The
[`architecture-roast` evaluation](evidence/architecture-roast-evaluation.md) remains the
primary behavioral evidence: its applications are not separate workflows to expose or
execute in sequence. Required mode selection, ambient routing machinery, automatic
documentation, hidden session state, and a mandatory pause between reasoning and
implementation are classified **remove**.

The four-command CLI, its mutation boundary, engine reconciliation behavior, removal of
a standalone validation surface, and read-model diagnostic ownership are accepted in
[`relic-2.0.md`](relic-2.0.md#minimal-cli-contract). `init`, `search`, and `serve` are
classified **replace/adapt** against the new contracts. Engine hook installation is
absorbed into `install`; `install --engine <engine>` installs that engine idempotently,
while no-argument installation discovers project-local engine roots. The current
`validate`, `use`, `scan`, `context`, `scaffold`, `write`, `toon-migrate`, `mode`,
`snippet`, `external`, `viewer-migrate`, `html-sync`, workflow commands, and self-upgrade
behavior are classified **remove**. MCP is excluded from the minimal surface pending
distribution evidence.

The path-addressed, read-only frontend, generic document page, catalog-first navigation,
local graph neighborhood, artifact boundary, internal API, and localized diagnostics are
accepted in [`relic-2.0.md`](relic-2.0.md#frontend-and-local-read-surface). Typed spec
HTML and canonical Markdown are the only semantic document grammars. Additional regular
files recursively inside spec folders remain searchable artifacts but do not become
catalog or graph nodes; unexpected files in shared and typed-record roots are not
promoted to artifacts. The current embedded localhost server and safe presentation
components are classified **adapt**; the spec/fix API, ID-only routes, spec-only
dashboard, fixed spec/plan/tasks tabs, interpreted validation summary, derived workflow
data, `viewer.json`, and MCP viewer bridge are classified **replace/remove**.

The accepted [`Relic 2.0 codebase inventory`](relic-2.0-codebase-inventory.md) records a
**keep**, **adapt**, **replace**, or **remove** disposition for the current workspace,
CLI, core, utilities, viewer, engine adapters, skills, plugin, templates, MCP surface,
packaging, CI, and tests. It also records the clean-rebuild default and the current test
baseline. Those classifications govern later implementation stages; similarity to a
retained capability does not by itself justify adapting its 1.x implementation.

### Gate

- A readiness roast reports no unresolved contradiction or blocking decision.
- One small fixture can represent a project map, shared contract, spec HTML, searchable
  spec artifact, FR, ADR, and the relations between canonical documents without relying
  on Relic 1.x session or ownership state.

## 2. Build the Knowledge Read Model

Implement the pure core that reads the accepted contracts:

- load `.relic/RELIC.md` and the corpus roots declared by its topology;
- discover `RELIC.md` and canonical Markdown across shared knowledge and typed records,
  plus `index.html` as the canonical typed HTML document in each specification folder;
- discover other regular files recursively inside specification folders as artifacts,
  deduplicating them for listing and supported full-text search without promoting them
  to document nodes;
- when topology overlaps, classify a physical file discovered through any canonical
  Markdown root as one canonical node rather than also treating it as a spec artifact;
- normalize identities and preserve optional project metadata without interpreting its
  status vocabulary;
- parse ordinary relative links only from canonical documents, derive backlinks, and
  retain link context;
- derive deterministic labels, catalog entries, and full-text content where supported;
- report broken links, duplicate identities, orphan nodes, and unsupported content
  without blocking unrelated discovery;
- enforce resolved-real-path repository containment for corpus roots, canonical files,
  artifacts, images, and attachments;
- expose one exhaustive read model consumed by search, diagnostics, and frontend code;
- exclude active-spec, active-fix, changelog, and exclusive-owner semantics.

Start with fixture-driven unit tests. The core must not depend on the HTTP server,
frontend, plugin, or a particular coding agent.

### Gate

- The fixture from Stage 1 loads deterministically.
- An overlapping topology produces one node with multiple memberships.
- Moving a declared corpus root exposes affected path links as repairable diagnostics.
- Broken links produce focused diagnostics while unrelated knowledge remains readable.
- Backlinks are derived without a manually synchronized reverse index.
- Every canonical fixture document remains cataloged and searchable even without graph
  edges.
- A Markdown artifact inside a specification is searchable with parent context but has
  no independent catalog node, metadata, graph edges, or backlinks.

## 3. Prove a Read-Only Vertical Slice

Connect the knowledge read model to the two retained product surfaces:

- search across shared knowledge, specs, and typed records;
- an exhaustive catalog and local frontend for canonical spec HTML, records, and shared
  knowledge, with spec artifacts listed separately;
- navigation between forward references, backlinks, and related records;
- visible orphan, duplicate-ID, unsupported-content, and broken-link diagnostics;
- semantic rendering for flows, charts, tables, callouts, and existing reusable
  components that still satisfy the 2.0 HTML contract;
- tolerant read-model diagnostics for malformed content without a separate validation
  command.

Reuse `fragment`, `view-data`, `serve`, search, and viewer code only where tests show
that their behavior is independent from 1.x modes, manifests, sessions, and fix pages.

### Gate

- One command or development entry point opens the fixture in the frontend.
- The same fixture is searchable without requiring agents to use search exclusively.
- Every canonical fixture document is browsable, including one intentionally orphaned
  document.
- A textual spec artifact appears in query results but not as a canonical document page.
- A broken relative link is visible at its source without breaking other pages.
- A spec page reaches its FR, ADR, and shared contract in both directions.
- No Relic 1.x workflow command is required by the vertical slice.

## 4. Build the Relic Skill Workflow

Turn the successful architecture-roast practice documented in the
[`architecture-roast` evaluation](evidence/architecture-roast-evaluation.md) into the
central Relic skill:

- preserve one generic reasoning protocol across discovery, readiness, compliance,
  operational, decomposition, fixes, and implementation rather than encoding a separate
  workflow for each application;
- treat those applications as optional internal lenses rather than user-facing commands,
  required selectors, or ordered phases;
- scale analysis to uncertainty, impact, and reversibility and continue into code and
  validation when they are part of the request;
- distinguish contradictions, blocking forks, derivable solutions, accepted risks,
  implementation details, future improvements, and non-problems;
- require evidence and recommendation before asking the developer to decide;
- ask only when multiple valid choices materially change behavior, authority, ownership,
  or scope;
- maintain a temporary decision ledger during long roasts;
- define objective completion and handoff criteria;
- read `.relic/RELIC.md` first when `AGENTS.md` does not already route through it;
- explore from the current target through relevant links and whichever native search
  mechanisms fit the task instead of loading the whole corpus or mandating Relic search;
- prefer updating existing knowledge before suggesting a new independently identified
  document;
- suggest specs, shared knowledge, and typed records at a natural boundary without
  interrupting work or silently creating them;
- treat decision agreement and authorization to persist as distinct unless the
  immediately preceding proposal made the resulting writes explicit;
- update current knowledge only after developer authorization.

Absorb the minimal record-writing behavior into the central skill and `RELIC.md`: read
topology, derive the next numeric value from the greatest current canonical identity,
check the proposed identity and destination case-insensitively, and write the
developer-requested document. Removing the greatest current identity permits later reuse
of that number. There is no persisted counter, lock, reservation, or tombstone. Remove
the separate record skill, JSON handoff, generator script, fixed status vocabulary,
fixed templates, and requirement to retain superseded files in active documentation.

### Gate

- Scenario tests or documented agent trials cover idea discovery, spec isolation, record
  extraction, implementation compliance, implementation after derivable decisions, and
  a fix that intentionally creates no new document.
- Every persisted artifact in those trials was explicitly requested or confirmed by the
  developer.
- A handoff can continue in another session from repository knowledge rather than hidden
  conversation state.
- No trial requires a mode selector, second prompt, or separate command to continue from
  reasoning into requested implementation.

## 5. Replace the CLI Surface

Implement only the four commands approved in Stage 1. The CLI provides deterministic
initialization, engine-skill installation, search, and frontend operations; it must not
orchestrate how the agent thinks or expose diagnostics as a separate validation
workflow.

At this stage:

- implement `relic init` without modifying `AGENTS.md`, defining or creating project
  governance structure, creating a second configuration file, or overwriting an existing
  `RELIC.md`;
- implement no-argument `relic install` to discover known project-local engine roots and
  install or refresh Relic in all of them, failing actionably when none exist;
- implement `relic install --engine <engine>` to install or refresh the selected skill
  in its project-local native directory without recording desired state;
- implement the thin project-local engine adapters required by `install`; defer
  cross-engine packaging and distribution proof to Stage 6;
- expose exhaustive current-corpus search with human and JSON projections;
- serve the frontend and its knowledge API;
- do not require a CLI command for record creation or numbering;
- remove any new dependency on session selection, model conversation history, workflow
  prompts, mode switching, or structured changelog writes.

Do not delete the legacy commands yet. First prove that every retained 2.0 capability is
available through the new surface.

### Gate

- A clean fixture can be initialized, searched, and viewed.
- Initialization leaves an existing `AGENTS.md` byte-for-byte unchanged.
- Initialization creates no project-governance schema, roles, or documentation.
- Initialization refuses to overwrite existing Relic project files.
- Initialization creates no `config.yaml` or other secondary state file.
- Installation without `--engine` refreshes every detected project-local engine root.
- Installation with `--engine` creates or refreshes only that engine's project-local
  Relic skill.
- A failed engine installation leaves no hidden desired state or mismatch lifecycle.
- CLI output contracts are tested and do not depend on one AI engine.
- `search` and `serve` do not mutate project knowledge.
- The accepted command surface contains no validation command or cognitive workflow
  stages.

## 6. Rebuild Distribution Around Skills

Package the central Relic skill, living-record support, CLI, and viewer for the supported
agents, building on the project-local adapters required by Stage 5:

- use each engine's project-local native skill discovery where available;
- keep engine-specific installation separate from project knowledge;
- make `.relic/RELIC.md` the stable project entry across engines;
- retain MCP only for frontend or knowledge access that materially improves the user
  experience;
- replace command-heavy plugin delivery with skill-first delivery;
- verify that unavailable ambient invocation degrades to explicit "use Relic" requests
  without breaking the workflow.

### Gate

- At least the primary supported agent discovers and runs the central skill from a clean
  project.
- Another supported engine can consume the same repository knowledge without a different
  document layout.
- Installation does not inject or own `AGENTS.md` or project documentation.

## 7. Retire Relic 1.x Machinery

After the 2.0 vertical slice, skill workflow, CLI, and distribution gates are green,
remove code that exists only for the discarded model:

- specify, clarify, plan, analyse, tasks, implement, fix, solve, use, and constitution
  prompt workflows;
- active spec/fix session and model conversation history;
- mandatory preamble, constitution, plan, tasks, changelog, and ownership validation;
- Markdown/HTML mode switching, dual-format synchronization, and migration paths that
  exist only for those modes;
- legacy ambient router skills and their duplicated guard/ladder blocks;
- manifest, write, external, upgrade, packaging, or direct-model machinery that the
  Stage 1 disposition audit marked for removal.

Adapt or delete tests with the code they describe. Do not keep compatibility shims for
removed workflows.

### Gate

- Repository search finds no user-facing instruction that requires a removed workflow.
- The full test, typecheck, build, and packaging checks pass against the reduced surface.
- Removal does not regress search, relationships, canonical HTML, or the frontend.

## 8. Use Operational Relic 2.0 to Self-Host and Release

This stage is not a prerequisite for proving the new architecture. It begins only after
the completed 2.0 capabilities can initialize, install, search, and serve an isolated
fixture or pilot without Relic 1.x machinery. Use that operational product to curate
this repository onto its own model:

- create its real `.relic/RELIC.md` map;
- retain and curate current `.relic/shared/` knowledge;
- express current FR, NFR, ADR, and EPIC records through the living-record contract;
- convert retained specifications to canonical 2.0 HTML while preserving useful
  supporting files as searchable artifacts;
- remove stale history from the active knowledge frontier while leaving Git intact;
- use the central skill for a real feature discussion, documentation extraction, fix,
  and compliance roast;
- update README, installation, contribution, security, and release documentation;
- run the full test, typecheck, build, packaging, and distribution checks plus an owner
  browser pass of the knowledge web.

### Gate

- The Relic repository can be understood and changed using only its 2.0 knowledge and
  skills.
- A second agent can recover the same current context without chat history.
- The frontend, search, and relationship graph agree on canonical nodes and on the
  searchable-artifact boundary.
- No 1.x compatibility promise remains in product documentation or release artifacts.
- No self-hosting decision required temporary compatibility or a pre-2.0 document
  mutation path.
