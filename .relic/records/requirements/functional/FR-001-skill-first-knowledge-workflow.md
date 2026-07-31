---
id: FR-001
---

# Skill-first knowledge workflow

Relic must expose one central skill that can use project knowledge to challenge an idea,
resolve ambiguity, review readiness or compliance, diagnose a failure, implement a
change, or perform a fix without requiring the developer to select a mode or invoke a
second prompt.

The skill scales scrutiny to uncertainty, consequence, and reversibility. It recommends
a course before asking about a material fork, derives the answer when current evidence
permits only one coherent choice, and stops asking when no remaining decision changes or
blocks the requested scope.

When work creates durable knowledge, the skill may propose a specification, shared
document, FR, NFR, ADR, or EPIC at a natural boundary. It must prefer updating existing
knowledge and may write only after the developer explicitly requests the artifact or
confirms a proposal that named the exact writes. Code authorization alone is not
documentation authorization.

The same invocation continues into implementation and validation when those actions are
part of the request. Consulting knowledge for a fix or ordinary development creates no
mandatory record.

See the [product boundary](../../../shared/SHARED-product.md) and
[skill-first architecture](../../decisions/ADR-001-skill-first-stateless-architecture.md).
