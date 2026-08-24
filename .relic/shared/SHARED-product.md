---
id: SHARED-product
---

# Relic product boundary

Relic is repository-local infrastructure for confronting, producing, preserving,
discovering, and presenting the current project documentation used by coding agents and
developers. Specifications remain important knowledge anchors; specification-driven
development is one way to produce knowledge, not a mandatory ceremony.

The product combines:

- one central skill that reduces ambiguity and continues through the developer's
  requested analysis, implementation, review, or fix;
- a living, linked knowledge corpus discovered through the topology in root relic.yaml;
- specialized full-text search for large repositories;
- a read-only local frontend that makes the knowledge web consultable;
- a four-command CLI limited to init, install, search, and serve.

Federation composes a selected root corpus with every Relic
project transitively reachable through explicit `federation.members` declarations.
Members may be independently governed packages without being separate Git repositories.
Working inside a member selects only that member and its declared federation subtree;
Relic never searches above the nearest project authority for an ancestor federation.
Federation changes consultability, not document ownership or the developer's authority
to approve coordinated writes.

Persistence is developer-owned. The skill may suggest that durable behavior,
constraints, architecture, coordinated delivery scope, or reusable knowledge deserves a
document, but it never creates that document silently. Fixes that restore an existing
contract and investigations that produce no durable knowledge need no new record.

Relic does not own AGENTS.md, project governance, coding-agent search strategy, status
vocabularies, hidden sessions, history, or a cognitive command pipeline. Project-local
native skill discovery is installation state; Git is historical recovery.

See the [canonical product specification](../specs/001-relic-2/index.html), the
[skill-first functional contract](../records/requirements/functional/FR-001-skill-first-knowledge-workflow.md),
the [skill-first architecture decision](../records/decisions/ADR-001-skill-first-stateless-architecture.md),
and the [federation specification](../specs/002-relic-federation/index.html).
