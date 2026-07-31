---
id: ADR-002
---

# Topology-owned, relative-link knowledge web

.relic/RELIC.md is the only machine-readable project authority. YAML frontmatter owns
corpus topology and the Markdown body owns free project guidance. Engines and numeric
high-water values are derived from native directories and current canonical identities,
so no second config file is maintained.

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
