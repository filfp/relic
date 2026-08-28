---
id: SHARED-knowledge-model
---

# Relic knowledge model

Each selected project's root relic.yaml is its single topology authority. Its required
topology contains the specification root, shared root, and a map of project-declared
record prefixes to Markdown roots. Federation adds an optional
sibling federation map of explicitly selected Relic projects. The file is configuration,
not a canonical document. No engine registry, ID counter, manifest, session file, or
hidden state participates in knowledge discovery.

Record kinds are open rather than compiled into Relic. Conventional topology may use
FR, NFR, ADR, BR, GL, and EPIC; a project may add or omit kinds. Each lowercase topology
key defines the corresponding uppercase numbered identity prefix, so `br` accepts
`BR-001` and a project-defined `risk` accepts `RISK-001`. Definitions, authorship, and
lifecycle remain project-owned metadata and governance.

Specifications remain durable anchors for system and feature knowledge without imposing
a specification-driven workflow. Notes, postmortems, incidents, runbooks, discussions,
and compound kinds such as `backend-postmortem` remain ordinary project-declared records.

Canonical nodes are:

- one semantic index.html inside each numbered specification folder;
- Markdown documents recursively found under declared shared and record roots.

Both canonical grammars read HTML through one allowlisted semantic vocabulary. A
Markdown record may embed the standard subset, including a disclosure that keeps a long
flow readable; the `relic-*` progressive-enhancement components stay specification-only.
An anchor authored in HTML is an ordinary relative link with the same edges, backlinks,
and diagnostics as its Markdown equivalent.

Only id is required metadata for native knowledge. Other metadata is optional and
opaque. Status values have no Relic-defined lifecycle. Identities compare
case-insensitively, while paths remain the navigation authority. Duplicate identities
stay visible as focused diagnostics and may be reconciled only with developer approval.

Every other regular file inside a specification folder is an artifact. Supported text
artifacts participate in full-text search with their specification as context, but they
do not become canonical nodes, graph inputs, or independently rendered knowledge.
Binary artifacts remain downloadable from their specification.

Ordinary relative links form a peer-to-peer web. Links convey navigation, not ownership
or hierarchy. The read model derives backlinks and related documents without writing a
reverse index. Missing paths, unsafe content, duplicates, and unsupported markup produce
localized diagnostics while unrelated knowledge remains readable.

Topology roots may live in `.relic/`, `docs/`, a repository-contained submodule, or any
other project-chosen location. The project that contains the code owns relic.yaml and
declares how it consumes the corpus; a storage repository needs no Relic configuration
of its own.

## Federation model

When the selected relic.yaml declares `federation.members`, its read model composes with
each valid member and continues through
the explicit federation declarations of every reached member. The nearest relic.yaml
still selects the entire invocation boundary: Relic does not inspect ancestors for
another federation or discover undeclared descendant projects. A member may be an
independently governed package without being a Git repository or submodule.

Every member retains its own topology, record kinds, graph, diagnostics, governance, and
filesystem boundary. Root membership controls visibility only; it grants no semantic
precedence and no automatic mutation authority. Intentional overlap between corpus roots
owned by different projects remains visible under each project and is not treated as a
global ownership error.

Federated addresses keep a hierarchical project path, project-relative document path,
and optional document identity as separate fields. The project path begins with the
reserved `root` segment and appends each local member key traversed from the selected
project. It is a view-local address, never a prefix written into document IDs. A project
realpath reached through multiple branches is loaded once; the shortest valid address
wins, with lexical ordering as the equal-depth tie-breaker, and repeated edges receive
localized configuration diagnostics.

Ordinary relative links may resolve from an ancestor project into any reachable
descendant. Their cross-project backlinks exist only in a composed view containing both
projects. Descendant links do not federate upward or across branches.

A descendant-authored relative boundary escape is project-address-qualified warning
evidence in the composed read model. Search, serve, and verify expose that same
diagnostic; it neither resolves the link nor changes the ordinary localized evidence.

The frontend and CLI consume the same exhaustive read model. Search is supplementary:
agents remain free to use filesystem traversal, grep, ripgrep, symbol search, and other
native exploration.

See the [topology and link decision](../records/decisions/ADR-002-topology-and-relative-links.md),
the [shared safe HTML vocabulary](../records/decisions/ADR-003-shared-safe-html-vocabulary.md),
the [read-only access requirement](../records/requirements/functional/FR-002-read-only-knowledge-access.md),
the [consultability requirement](../records/requirements/non-functional/NFR-002-safe-consultability.md),
and the [federation specification](../specs/002-relic-federation/index.html).
