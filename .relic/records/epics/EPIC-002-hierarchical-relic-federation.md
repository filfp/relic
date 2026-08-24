---
id: EPIC-002
---

# Hierarchical Relic federation

Relic delivers explicit hierarchical federation across its deterministic packages,
viewer, distributions, and central skill. A selected project exposes its own corpus plus every
safe project transitively reachable through declared `federation.members` edges, while a
nested invocation remains bounded to that project's own federation subtree.

The accepted behavior is defined by the
[federation specification](../../specs/002-relic-federation/index.html). This EPIC
coordinates delivery evidence; it does not replace or reopen that contract.

## Delivery boundaries

- Federation follows only explicit edges declared by reached `relic.yaml` files. It never
  scans ancestors or descendants for undeclared projects.
- A member is a Relic project boundary with its own configuration, topology, graph,
  diagnostics, identities, and governance. It need not be a Git repository or submodule.
- Project addresses are hierarchical and view-local, beginning with `root`; document IDs
  and project-relative paths remain owned by their projects.
- Search, serve, and HTTP remain read-only. Init, install, and engine discovery remain
  local to the selected project.
- Package behavior and transport must be complete before the central skill claims or uses
  federation behavior.

## Delivery sequence and gates

Federation was delivered through ordered gates, with each later boundary built on the
stable typed contract and focused tests of the previous one:

1. Close the remaining transport contract in the federation specification.
2. Split configuration reading, local corpus loading, and federated composition in core.
3. Complete traversal, project and edge models, addressed relationships, search, and
   diagnostics in core.
4. Deliver CLI selection, HTTP serialization, artifact safety, and derived refresh.
5. Adapt the viewer to the stable transport without moving knowledge interpretation into
   React.
6. Rewrite and distribute the central skill only after package behavior is complete.
7. Run source and distribution gates, then update the accepted documents from
   not-implemented to delivered behavior.

The [federation specification](../../specs/002-relic-federation/index.html) owns the exact
HTTP serialization and federated response discriminant described below. The EPIC records
delivery scope and evidence; it does not become a substitute public API contract.

## Core configuration and project model

Extend `packages/core` without coupling it to CLI or viewer concerns:

- separate configuration reading, local corpus loading, and selected-boundary composition
  behind explicit internal or exported interfaces instead of adding recursive behavior to
  one monolithic loader;
- parse required local `topology` and optional `federation.members` independently so an
  invalid local corpus can coexist with readable member declarations;
- validate lowercase kebab-case local member keys, reserve `root`, and validate each
  member as a contained project-relative directory with a regular non-symlinked
  `relic.yaml`;
- preserve `KnowledgeProject`, canonical documents, artifacts, and project-relative paths
  as the atomic local read model;
- introduce a separate selected-boundary aggregate that owns hierarchical addresses,
  project nodes, federation edges, aggregate indexes, search ordering, and diagnostics;
- wrap local documents and artifacts with their owning project address in aggregate views
  rather than persisting or injecting federation identity into the local nodes;
- preserve current single-project behavior and transport shapes when federation is absent.

The aggregate must expose federation edges as first-class evidence. Each edge retains its
parent address, local key, declared project-relative path, optional child address, status,
and localized diagnostics. It must represent valid, invalid, unavailable, repeated, and
noncanonical alias edges even when no child project can be loaded. Filesystem realpaths
remain internal authorities and never become public route identifiers.

## Explicit federation traversal and composition

Compose project read models through the declared graph:

- accept the exact selected project root from the caller; nearest-project discovery
  remains exclusively owned by `packages/cli-node`;
- traverse the federation declarations of every valid reached member;
- discover and normalize the project and edge graph before composing document, artifact,
  relationship, and search indexes;
- load each project realpath at most once per derived refresh;
- when multiple edges reach one realpath, select the shortest valid address and use
  lexical address ordering as the equal-depth tie-breaker;
- diagnose noncanonical aliases and repeated realpaths on their declaring edges without
  hiding the canonical project or unrelated branches;
- keep intentional overlap between independently owned corpus topologies visible without
  global ownership, deduplication, or overlap diagnostics;
- preserve stable aggregate ordering by score, project-address segments, and
  project-relative path.

Failure isolation must match the specification matrix. An invalid edge hides only the
subtree reachable solely through it. Structurally unreadable member configuration hides
that member and otherwise unreachable descendants. Invalid local topology leaves readable
member declarations available, and invalid record roots do not erase other valid roots.

## Federated graph, search, and artifacts

Extend the core read model consistently:

- aggregate canonical documents and searchable artifacts while retaining their complete
  project address;
- define structured document and artifact addresses and use them in links, backlinks,
  related documents, artifact parents, specification references, diagnostics, and search
  results; no aggregate relationship may rely on a bare project-relative path;
- retain raw authored link evidence through local loading and perform federated link
  classification only after the reachable project index is known;
- resolve ordinary relative links from an ancestor project into any validated reachable
  descendant;
- derive the corresponding cross-project backlink only in a composed view containing
  both projects;
- keep descendant-to-ancestor and cross-branch links outside the federated graph;
- route artifact lookup through a validated project address and a discovered
  project-relative artifact path;
- return localized address-qualified diagnostics without making unrelated knowledge
  unavailable.

## Federated transport contract

The package implementation must follow one transport shape after it is promoted into the
federation specification:

- JSON represents `ProjectAddress` as a non-empty string array beginning with `root`;
- HTTP and browser query parameters serialize that address as slash-joined validated
  member-key segments, for example `project=root/product/api`;
- an absent `project` parameter selects `root`, preserving current root document,
  artifact, and content routes;
- browser document and artifact paths remain project-relative and carry federation
  ownership in the `project` query parameter;
- federated project responses contain a `federation` envelope with project nodes and
  edges, while responses for projects without federation retain their current shape;
- every federated document, artifact, search result, relationship, parent, and diagnostic
  reference carries its structured project address;
- member filesystem roots are never accepted as client-selected identifiers or artifact
  authorities.

## CLI and HTTP delivery

Update `packages/cli-node` around the core-owned meaning:

- preserve nearest regular non-symlinked project discovery and never climb after a
  boundary has been selected;
- make `relic search` expose aggregate results with hierarchical project addresses;
- allow search and serve to continue when the selected project's local topology is
  unavailable but its structurally readable configuration reaches valid member corpora;
- report localized federation diagnostics alongside usable human and JSON search results
  instead of treating every root-topology error as a fatal command error;
- reserve fatal command failure for a selected boundary that cannot be interpreted safely
  enough to expose any valid local or member corpus;
- make `relic serve` expose the same composed read model through stable document,
  relationship, diagnostic, search, and artifact transport;
- reject unknown address segments, boundary escapes, unsafe authorities, and arbitrary
  filesystem paths without hiding safe projects;
- keep `relic init` and `relic install` project-local and retain the four-command public
  surface.

The serve reader must rebuild the reachable configuration graph and derived aggregate
after its process-local cache expires. It may not retain the startup member list as
authoritative state.

## Viewer delivery

Update `packages/viewer` as presentation over the core transport:

- present the selected root and nested members as a project tree;
- consume the transport's project and edge models, including invalid and alias edges,
  without reconstructing federation from diagnostics or paths;
- preserve the owning project in catalog, document, artifact, relationship, backlink, and
  search navigation;
- use composite project-and-path identities for routes, React keys, selection, related
  knowledge, artifact parents, and backlink navigation;
- distinguish equal document IDs and equal local member keys by hierarchical project
  address rather than inventing global IDs;
- present member failures, repeated edges, unsafe entries, and other federation
  maintenance evidence in the owning project or edge context;
- retain readable valid projects and current single-project presentation when federation
  is absent.

The viewer must not parse `relic.yaml`, traverse the filesystem, resolve federation, or
reinterpret diagnostics independently.

## Engines and central skill

Keep `packages/engines` project-local. Installation and discovery must not traverse
federation members, and every distribution must continue to install the same portable
skill content atomically.

With core, CLI transport, and viewer behavior stable, the distributed skill must:

- revise `skills/relic/SKILL.md` with the minimal selected-boundary and conditional
  federation-reference routing;
- add a focused federation reference for cross-project confrontation, project ownership,
  top-down links, and explicitly authorized multi-project authoring;
- keep deterministic parsing, traversal, normalization, routing, caching, and failure
  behavior out of the skill;
- regenerate embedded skill content and refresh self-hosted engine installations through
  the official installer rather than editing generated or installed copies;
- prove source and installed skill copies agree for every supported engine.

## Required fixtures and evidence

Add focused fixtures and tests that prove:

- a three-level root, product, and package federation is traversed only through declared
  edges;
- selecting the product exposes only the product subtree, and selecting the package never
  consults ancestors;
- a governed package works without its own Git repository;
- undeclared descendant `relic.yaml` files, including fixtures and vendors, have no
  effect;
- equal document IDs, paths, and local member keys under different branches remain
  independently addressable;
- links, backlinks, related documents, artifact specification parents, diagnostics, and
  search results with equal local paths retain the correct project address;
- federation project responses expose project and edge evidence through the discriminated
  envelope, while non-federated response snapshots remain unchanged;
- `project=root/product/api` round-trips between JSON addresses, HTTP queries, browser
  navigation, and artifact content lookup, with absent `project` selecting `root`;
- direct and nested edges reaching one realpath load it once under the deterministic
  canonical address and diagnose the other edges;
- malformed member entries, unreadable member configuration, invalid local topology,
  and invalid record roots preserve every independently safe project;
- CLI search and serve remain usable when root topology is invalid but a declared member
  corpus is valid, while a wholly unsafe boundary still fails explicitly;
- intentional corpus overlap is preserved without an ownership diagnostic;
- ancestor-to-descendant canonical links and federated backlinks exist only in the
  composed view, while upward and cross-branch links remain bounded;
- unknown address segments, absolute paths, traversal escapes, symlinked authorities, and
  unsafe artifact requests cannot expose content;
- work is bounded by the reachable declared graph and each project is loaded at most once
  per refresh;
- after serve starts, adding or removing a member, changing nested federation, changing a
  descendant document, or introducing a shorter canonical route is reflected after the
  next derived refresh without persisted cache state;
- projects without federation preserve current core, search, API, viewer, init, install,
  and distribution behavior.

Run the focused package suites first, then the repository gates from the
[implementation map](../../shared/SHARED-development.md): lint, typecheck, source tests,
distribution tests, and dependency audit. Distribution evidence must cover the Node
bundle, compiled Bun binary, supported engine installations, embedded viewer, npm package,
and native-wheel verification for the current platform. Cross-platform wheel coverage
remains owned by the supported CI and publication matrix.

## Completion evidence

Implementation, generated outputs, documentation, and distributed behavior agree with
the federation specification. Focused tests cover hierarchical traversal, selected
boundaries, addressed relationships and search, top-down links, overlap ambiguity,
failure isolation, HTTP routing and artifact safety, cache refresh, viewer identities,
and conditional skill distribution.

Repository validation completed with lint, typecheck, all source package suites, the
self-contained npm and Bun distribution gate, embedded viewer and native engine
discovery, package-content checks, macOS arm64 wheel metadata/content/install smoke, and
a dependency audit with no known vulnerabilities. Cross-platform wheel coverage remains
owned by supported CI. Release versioning,
changelog, publication, and registry verification remain outside this implementation
scope until explicitly authorized.

See the [knowledge model](../../shared/SHARED-knowledge-model.md),
[read-only access requirement](../requirements/functional/FR-002-read-only-knowledge-access.md),
[safe consultability requirement](../requirements/non-functional/NFR-002-safe-consultability.md),
[portable operation requirement](../requirements/non-functional/NFR-001-portable-stateless-operation.md),
[topology and links decision](../decisions/ADR-002-topology-and-relative-links.md), and
[skill-first architecture](../decisions/ADR-001-skill-first-stateless-architecture.md).
