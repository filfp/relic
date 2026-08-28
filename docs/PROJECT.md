# Relic repository map

This is project-owned guidance for agents contributing to this repository. It
lives outside the topology in `relic.yaml`, so it is not a canonical Relic
document, search node, or viewer page.

## Product shape

Relic is a thin shared-knowledge layer for coding agents. A central skill helps
agents confront ideas, inspect code and current knowledge, and persist only
developer-approved conclusions. A small CLI initializes topology, installs the
skill, searches the corpus, and serves a read-only viewer.

The repository is a Bun workspace. TypeScript packages share source directly
during development; release builds embed the skill and viewer so published
artifacts do not depend on the workspace layout.

## Package ownership

### `packages/core`

Owns the deterministic read model for a Relic project:

- loading and validating the topology from the root `relic.yaml`;
- discovering canonical Markdown records, shared documents, typed HTML specs,
  and non-canonical spec artifacts;
- parsing frontmatter, Markdown, and the safe semantic HTML vocabulary;
- resolving links, backlinks, memberships, and diagnostics;
- producing project, document, artifact, and search views.

Core must remain independent of Commander, HTTP, React, engine installation,
and host-agent behavior. If both the CLI and viewer need the same knowledge
meaning, that meaning normally belongs here.

### `packages/engines`

Owns project-local skill discovery and installation:

- maps supported engine names to their native project directories;
- discovers engines from filesystem evidence;
- installs the embedded central skill with staging and rollback;
- filters target-owned metadata so `agents/openai.yaml` reaches Codex only.

The source skill is not authored in this package. `skills/relic` is embedded
into `src/generated/relic-skill.ts` by the build pipeline.

### `packages/cli-node`

Owns the executable product surface:

- `init` creates the minimal root `relic.yaml` and no project governance;
- `install` delegates engine discovery and installation;
- `search` exposes the core search model for humans and agents;
- `serve` exposes the read-only HTTP API and embedded viewer on localhost;
- `verify` exposes deterministic, read-only gate checks over the selected project;
- project discovery walks upward for a regular, non-symlinked `relic.yaml`.

It orchestrates core and engines but must not duplicate their interpretation or
installation logic. `src/generated/viewer-assets.ts` is build output generated
from `packages/viewer`.

### `packages/viewer`

Owns browser presentation of the read model returned by the CLI API:

- catalog, document, artifact, component, and maintenance pages;
- rendering of Markdown AST and the supported semantic HTML components;
- visible diagnostics for broken links and other maintenance signals;
- navigation, search interaction, and styling.

The viewer does not read the filesystem, parse source documents, infer topology,
or mutate project knowledge. It presents core-owned meaning.

### `packages/cli-python`

Owns the PyPI wrapper. It packages and launches the platform-specific compiled
Relic binary; it must not become a second CLI implementation or knowledge
model. `relic/relic` and `relic/relic.exe` are distribution artifacts.

## Other owned areas

### `skills/relic`

The sole authored source of the central Relic skill. `SKILL.md` defines its
portable behavior; `references/` contains focused authoring contracts;
`agents/openai.yaml` is Codex-owned metadata filtered during installation.
Never patch `.agents/skills/relic`, `.codex/skills/relic`, or generated embedded
content as an independent implementation.

### `scripts`

Own build and release mechanics:

- `embed-skill.ts` serializes the central skill for `packages/engines`;
- `embed-viewer.ts` builds and serializes the viewer for `packages/cli-node`;
- distribution scripts exercise npm, compiled-binary, and wheel boundaries;
- `publish.ts` coordinates release preparation.

Scripts may assemble or verify packages, but they must not introduce a parallel
product contract.

### `.github/workflows`

Owns CI and publication automation. Source validation covers supported Node
runtimes; publishing workflows build the same embedded assets and distribution
shapes tested locally.

### `.relic` and `relic.yaml`

`relic.yaml` is the only project configuration authority. Its topology paths contain the
current canonical product knowledge: specs, shared documents, and project-defined record
kinds such as requirements, decisions, business rules, glossary entries, and epics. Its
optional federation map adds explicit, transitively composed member-project edges without
filesystem autodiscovery.

### `docs`

Owns conventional contributor guidance for this repository. `PROJECT.md`,
`PRINCIPLES.md`, and `PUBLISHING.md` are deliberately outside the Relic topology.
They govern contributors without teaching the product to special-case
self-hosting or treating project operations as canonical product knowledge.

## Dependency direction

```text
skills/relic ──embed──> packages/engines ──┐
                                           ├──> packages/cli-node
packages/core ─────────────────────────────┤           │
                                           │           ├──> npm executable
packages/viewer ──embed────────────────────┘           └──> compiled binary
                                                               │
                                                               └──> Python wheel
```

The viewer may import core types, but runtime knowledge reaches it through the
CLI's HTTP API. No package should depend on generated release wrappers to define
source behavior.

## Where a change belongs

- A new knowledge meaning, diagnostic, or search rule belongs in core first.
- A new visual treatment for an existing read-model shape belongs in viewer.
- Engine paths, discovery, metadata routing, and atomic installation belong in
  engines.
- Command flags, stdout/stderr behavior, HTTP transport, and executable assembly
  belong in cli-node.
- Portable agent judgment belongs in the central skill or one of its references.
- Packaging-only behavior belongs in scripts or cli-python, never in core.
- A durable product decision belongs in the canonical corpus selected by
  `relic.yaml`, after developer approval.

When a proposal appears to belong everywhere, first look for a missing stable
contract at the lowest shared layer. Do not copy logic across packages to avoid
making that boundary explicit.
