---
id: SHARED-product
---

# Relic product boundary

Relic is repository-local infrastructure for producing, preserving, discovering, and
presenting the current project knowledge used by coding agents and developers.
Spec-driven development is one way to produce knowledge, not a mandatory ceremony.

The product combines:

- one central skill that reduces ambiguity and continues through the developer's
  requested analysis, implementation, review, or fix;
- a living, linked knowledge corpus entered through .relic/RELIC.md;
- specialized full-text search for large repositories;
- a read-only local frontend that makes the knowledge web consultable;
- a four-command CLI limited to init, install, search, and serve.

Persistence is developer-owned. The skill may suggest that durable behavior,
constraints, architecture, coordinated delivery scope, or reusable knowledge deserves a
document, but it never creates that document silently. Fixes that restore an existing
contract and investigations that produce no durable knowledge need no new record.

Relic does not own AGENTS.md, project governance, coding-agent search strategy, status
vocabularies, hidden sessions, history, or a cognitive command pipeline. Project-local
native skill discovery is installation state; Git is historical recovery.

See the [canonical product specification](../specs/001-relic-2/index.html), the
[skill-first functional contract](../records/requirements/functional/FR-001-skill-first-knowledge-workflow.md),
and the [skill-first architecture decision](../records/decisions/ADR-001-skill-first-stateless-architecture.md).
