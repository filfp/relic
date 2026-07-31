---
id: ADR-002
---

# Topology-owned, relative-link knowledge web

The root relic.yaml is the only machine-readable project authority. It contains corpus
topology only and is not part of the knowledge graph. Engines and numeric high-water
values are derived from native directories and current canonical identities, so no
second config file is maintained.

Topology belongs to the code-bearing project that uses Relic. Its roots may point into
a repository-contained submodule used as durable shared storage; Relic does not import,
delegate to, or auto-discover another topology file inside that corpus.

Canonical documents are peer nodes. Ordinary repository-relative links create graph
edges and derived backlinks; IDs are catalog identities, not a custom link protocol.
Specifications and EPICs are common entry points but own no subordinate documents.

Topology changes may orphan authored paths. The read model exposes broken links and the
skill may propose a grep-assisted repair session, but Relic does not parse and rewrite
the corpus automatically. Duplicate IDs remain usable diagnostics; reconciliation is a
developer-authorized content change.

This minimizes authoring machinery while keeping links readable in Git hosts, editors,
browsers, and agents without a Relic integration.

See the [knowledge model](../../shared/SHARED-knowledge-model.md) and
[read-only access requirement](../requirements/functional/FR-002-read-only-knowledge-access.md).
