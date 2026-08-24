---
id: ADR-002
---

# Project-owned topology, explicit federation, and relative links

Each selected project's root relic.yaml is its only machine-readable project authority.
Its required `topology` object declares the local corpus. The accepted federation
extension adds an optional sibling `federation.members` map of explicit direct Relic
projects; it does not add another configuration file, registry, or knowledge node.

The nearest regular, non-symlinked relic.yaml found from the working directory selects
the complete invocation boundary. Relic does not search above it for an ancestor
federation. A monorepo root can therefore expose global and member knowledge, while work
started inside a backend remains bounded to the backend's own selected configuration.

Topology belongs to the project that consumes the corpus. Its roots may point into a
project-contained submodule used as durable shared storage without requiring that storage
repository to have Relic configuration. A federation member is different: it is an
independently usable project with its own relic.yaml, topology, identities, governance,
graph, diagnostics, and filesystem boundary.

Federation membership controls visibility, not semantic precedence or mutation
authority. The root composes independent read models and identifies them with view-local
member keys. Document IDs remain owned by their projects and are never prefixed or
rewritten. Equal IDs and paths across projects are not conflicts. Intentional overlap
between project corpus topologies is a developer ownership choice and is not globally
deduplicated or diagnosed.

Duplicate federation entries resolving to the same project realpath are configuration
ambiguity. They are loaded once, later aliases receive localized diagnostics, and valid
root and member knowledge remain available. The selected project cannot declare itself
as a member. Federation parsing and local topology parsing remain isolated whenever the
selected YAML is safe and structurally readable.

Canonical documents remain peer nodes. Ordinary project-relative links create graph
edges and derived backlinks; IDs are catalog identities, not a custom link protocol.
In a composed view, a root document may link through an ordinary contained path to a
canonical document or artifact in a direct member. The corresponding backlink exists
only in that federated view. Member links do not federate upward or sideways and cannot
escape the member boundary.

Topology or membership changes may orphan authored paths. The read model exposes broken
links and the skill may propose a grep-assisted repair, but Relic does not rewrite or
synchronize corpora automatically. The developer may explicitly authorize coordinated
writes in the root and members; each project remains authoritative for its destination.

The federation decision is accepted but not yet implemented. See the
[knowledge model](../../shared/SHARED-knowledge-model.md),
[read-only access requirement](../requirements/functional/FR-002-read-only-knowledge-access.md),
and [federation specification](../../specs/002-relic-federation/index.html).
