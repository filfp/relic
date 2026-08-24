---
id: ADR-002
---

# Project-owned topology, explicit federation, and relative links

Each selected project's root relic.yaml is its only machine-readable project authority.
Its required `topology` object declares the local corpus. Federation adds an optional
sibling `federation.members` map of explicit local project
edges. A reached member's own federation declarations are traversed transitively; Relic
does not add another configuration file, registry, or knowledge node.

The nearest regular, non-symlinked relic.yaml found from the working directory selects
the complete invocation boundary. Relic does not search above it for an ancestor
federation. A monorepo root can therefore expose global and transitively reachable
member knowledge, while work started inside a backend remains bounded to the backend's
own selected federation subtree.

Topology belongs to the project that consumes the corpus. Its roots may point into a
project-contained submodule used as durable shared storage without requiring that storage
repository to have Relic configuration. A federation member is different: it is an
independently usable Relic project with its own relic.yaml, topology, identities,
governance, graph, diagnostics, and filesystem boundary. It may be an ordinary package
or directory and does not need to be a Git repository or submodule.

Federation membership controls visibility, not semantic precedence or mutation
authority. The selected root composes independent read models through explicit member
edges and identifies them with hierarchical, view-local key paths beginning at `root`.
Document IDs remain owned by their projects and are never prefixed or rewritten. Equal
IDs, paths, or local member keys under different projects are not conflicts. Intentional
overlap between project corpus topologies is a developer ownership choice and is not
globally deduplicated or diagnosed.

Federation edges that reach the same project realpath are configuration ambiguity. Each
realpath is loaded once across the composed tree; the shortest valid address wins, with
lexical ordering as the equal-depth tie-breaker, and repeated edges receive localized
diagnostics without traversal. No project can declare itself as a member. Federation
parsing and local topology parsing remain isolated whenever a reached YAML is safe and
structurally readable.

Canonical documents remain peer nodes. Ordinary project-relative links create graph
edges and derived backlinks; IDs are catalog identities, not a custom link protocol.
In a composed view, an ancestor document may link through an ordinary contained path to
a canonical document or artifact in any reachable descendant. The corresponding backlink
exists only in a view containing both projects. Descendant links do not federate upward
or across branches and cannot escape the selected subtree.

Topology or membership changes may orphan authored paths. The read model exposes broken
links and the skill may propose a grep-assisted repair, but Relic does not rewrite or
synchronize corpora automatically. The developer may explicitly authorize coordinated
writes in the root and members; each project remains authoritative for its destination.

See the [knowledge model](../../shared/SHARED-knowledge-model.md),
[read-only access requirement](../requirements/functional/FR-002-read-only-knowledge-access.md),
and [federation specification](../../specs/002-relic-federation/index.html).
