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
- Reuse code only after it is shown to serve the 2.0 contract without retaining a 1.x
  workflow assumption.
- Keep product contracts, implementation, and retirement decisions auditable in separate
  changes.
- Validate each stage with focused tests before expanding the surface.
- Do not create backward-compatibility machinery. Migrate this repository deliberately
  after the new model works.

## 1. Close the Relic 2.0 Contracts

Define the smallest deterministic contracts needed by skills, CLI, search, and frontend:

- `.relic/RELIC.md`: structured topology, project-owned mappings, governance roles,
  corpus roots, and free-form agent guidance;
- `.relic/config.yaml`: managed engines and high-water marks only, without duplicated
  topology or workflow preferences;
- document identity, optional project metadata, and living-record mutation freedom;
- references, backlinks, and relationship resolution without exclusive ownership;
- canonical spec HTML and the supported semantic component vocabulary;
- search corpus, indexing, freshness, and behavior when metadata is incomplete;
- central Relic skill modes, recommendation behavior, authorization boundary, and
  completion criteria;
- the minimal CLI capabilities required by those contracts;
- the frontend's read model and its authority boundaries.

The `RELIC.md` topology and `config.yaml` contracts are accepted in
[`relic-2.0.md`](relic-2.0.md#project-file-contract). Their schemas and failure behavior
are inputs to the remaining Stage 1 contracts rather than open topology decisions.

Document identity, native metadata scope, opaque project fields, and mutation freedom are
accepted in [`relic-2.0.md`](relic-2.0.md#document-identity-and-mutation-contract). The
current `requirement-records` skill is classified **adapt**: retain focused generation
and testable content, replace global `docs/` scanning with topology and high-water state,
and remove its fixed status vocabulary, mandatory `origin`, historical-supersession rule,
and fixed output roots.

For every current subsystem, record one disposition: **keep**, **adapt**, **replace**, or
**remove**. This inventory must cover the core commands, viewer, engine adapters, plugin,
templates, MCP surface, packaging, and tests.

### Gate

- A readiness roast reports no unresolved contradiction or blocking decision.
- One small fixture can represent a project map, shared contract, spec HTML, FR, ADR, and
  the relations between them without relying on Relic 1.x session or ownership state.

## 2. Build the Knowledge Read Model

Implement the pure core that reads the accepted contracts:

- load `.relic/RELIC.md` and the corpus roots declared by its topology;
- discover governance documents, shared knowledge, specs, and typed records;
- normalize identities and current statuses;
- resolve forward references and derive backlinks;
- report broken or ambiguous references without blocking unrelated discovery;
- expose one read model consumed by search, validation, and frontend code;
- exclude active-spec, active-fix, changelog, and exclusive-owner semantics.

Start with fixture-driven unit tests. The core must not depend on the HTTP server,
frontend, plugin, or a particular coding agent.

### Gate

- The fixture from Stage 1 loads deterministically.
- Moving a declared corpus root does not change semantic identities unexpectedly.
- Broken references produce focused diagnostics while unrelated knowledge remains
  readable.
- Backlinks are derived without a manually synchronized reverse index.

## 3. Prove a Read-Only Vertical Slice

Connect the knowledge read model to the two retained product surfaces:

- search across governance, shared knowledge, specs, and typed records;
- the local frontend for canonical spec HTML and current project documentation;
- navigation between forward references, backlinks, and related records;
- semantic rendering for flows, charts, tables, callouts, and existing reusable
  components that still satisfy the 2.0 HTML contract;
- read-only validation and useful diagnostics for malformed content.

Reuse `fragment`, `view-data`, `serve`, search, and viewer code only where tests show
that their behavior is independent from 1.x modes, manifests, sessions, and fix pages.

### Gate

- One command or development entry point opens the fixture in the frontend.
- The same fixture is searchable without requiring agents to use search exclusively.
- A spec page reaches its FR, ADR, and shared contract in both directions.
- No Relic 1.x workflow command is required by the vertical slice.

## 4. Build the Relic Skill Workflow

Turn the successful architecture-roast practice documented in the
[`architecture-roast` evaluation](evidence/architecture-roast-evaluation.md) into the
central Relic skill:

- add explicit discovery, readiness, compliance, operational, and decomposition modes;
- distinguish contradictions, blocking forks, derivable solutions, accepted risks,
  implementation details, future improvements, and non-problems;
- require evidence and recommendation before asking the developer to decide;
- ask only when multiple valid choices materially change behavior, authority, ownership,
  or scope;
- maintain a temporary decision ledger during long roasts;
- define objective completion and handoff criteria;
- read `.relic/RELIC.md` first when `AGENTS.md` does not already route through it;
- suggest specs and typed records without silently creating them;
- update current knowledge only after developer authorization.

Align the record-creation skill and generator with living records. Remove the current
requirement to retain superseded files in active documentation.

### Gate

- Scenario tests or documented agent trials cover idea discovery, spec isolation, record
  extraction, implementation compliance, and a fix that intentionally creates no new
  document.
- Every persisted artifact in those trials was explicitly requested or confirmed by the
  developer.
- A handoff can continue in another session from repository knowledge rather than hidden
  conversation state.

## 5. Replace the CLI Surface

Implement only the capabilities approved in Stage 1. The CLI should provide deterministic
filesystem, search, validation, and viewer operations that skills benefit from; it must
not orchestrate how the agent thinks.

At this stage:

- initialize the Relic-owned files and roots declared by `RELIC.md` without modifying
  `AGENTS.md`;
- expose the accepted search and read-only validation behavior;
- serve the frontend and its knowledge API;
- provide only deterministic scaffolding or numbering justified by the record and spec
  contracts;
- remove any new dependency on session selection, model conversation history, workflow
  prompts, mode switching, or structured changelog writes.

Do not delete the legacy commands yet. First prove that every retained 2.0 capability is
available through the new surface.

### Gate

- A clean fixture can be initialized, read, searched, validated, and viewed.
- Initialization leaves an existing `AGENTS.md` byte-for-byte unchanged.
- CLI output contracts are tested and do not depend on one AI engine.
- The accepted command surface contains no cognitive workflow stages.

## 6. Rebuild Distribution Around Skills

Package the central Relic skill, living-record support, CLI, and viewer for the supported
agents:

- use each engine's native skill discovery where available;
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
- Installation does not inject or own project governance files.

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
- The full test, typecheck, build, plugin, and packaging checks pass against the reduced
  surface.
- Removal does not regress search, relationships, canonical HTML, or the frontend.

## 8. Self-Host Relic 2.0 and Release

Move this repository itself onto the completed model:

- create its real `.relic/RELIC.md` map;
- retain and curate current `.relic/shared/` knowledge;
- express current FR, NFR, ADR, and EPIC records through the living-record contract;
- convert retained specifications to canonical 2.0 HTML with free supporting content;
- remove stale history from the active knowledge frontier while leaving Git intact;
- use the central skill for a real feature discussion, documentation extraction, fix,
  and compliance roast;
- update README, installation, contribution, security, and release documentation;
- run full automated validation plus an owner browser pass of the knowledge web.

### Gate

- The Relic repository can be understood and changed using only its 2.0 knowledge and
  skills.
- A second agent can recover the same current context without chat history.
- The frontend, search, and relationship graph agree on the current corpus.
- No 1.x compatibility promise remains in product documentation or release artifacts.
