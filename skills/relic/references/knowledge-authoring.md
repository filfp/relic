# Knowledge Authoring

Read this reference only when the developer has authorized a knowledge write or when a
proposed write needs a concrete destination.

## Follow the Project Topology

Read the `relic.yaml` of the project that will own the knowledge write. Its topology is
the sole authority for that project's destinations:

```yaml
topology:
  specs: .relic/specs
  shared: .relic/shared
  records:
    fr: docs/requirements/functional
    nfr: docs/requirements/non-functional
    adr: docs/decisions
    br: docs/business-rules
    gl: docs/glossary
    epic: docs/epics
```

The configuration is not a knowledge document. In addition to local topology it may
declare explicit `federation.members`; federation does not replace or merge any member's
topology. Every corpus root is project-owned. Do not assume the example paths, reject
overlapping roots, or copy topology into another file. Derive authored relative links
from the current locations.

When an authorized change spans federated projects, read each owning project's
`relic.yaml` and instructions before writing there. Do not redirect a member record into
the selected root merely because the root can consult it.

## Choose the Smallest Useful Identity

- A specification synthesizes a feature or system surface in canonical `index.html`.
- Shared knowledge stands independently and is reusable across specifications or
  records.
- An FR captures one user-visible goal as functional behavior with testable acceptance
  criteria.
- An NFR captures a quality attribute with a measurable target.
- An ADR captures a structural decision whose rationale matters to current work.
- A BR captures a domain invariant or policy such as an enum, cardinality, state
  transition, temporal rule, or system boundary.
- A GL entry fixes the project's operational meaning of a domain entity, state, enum,
  or overloaded term whose ordinary reading would be misleading.
- An EPIC captures coordinated delivery scope large enough to benefit from an independent
  implementation boundary.

These are common meanings, not a closed taxonomy. Every lowercase key under
`topology.records` declares another record kind whose identity prefix is the uppercase
key. Follow project-owned definitions, authorship, and lifecycle rules when they exist;
Relic does not infer ownership or make a record append-only.

These are peer nodes in a knowledge web, not a hierarchy. Specifications and EPICs are
common entry points because they aggregate context. No kind owns another document.

Only `id` is required metadata. Preserve optional project fields without imposing their
vocabulary:

```yaml
---
id: FR-016
status: needs-review
owner: platform
---
```

Canonical identities are case-insensitive:

- specification: `001-auth`;
- functional requirement: `FR-001`;
- non-functional requirement: `NFR-001`;
- architecture decision: `ADR-001`;
- business rule: `BR-001`;
- glossary entry: `GL-001`;
- implementation epic: `EPIC-001`;
- project-declared `risk` record: `RISK-001`;
- shared knowledge: `SHARED-auth-api`.

Record filenames contain the ID and a readable slug. A specification folder is named by
its ID and contains canonical `index.html`. Other files inside a specification folder
are searchable artifacts, not canonical Relic documents.

## Allocate a Number Without State

For a requested numbered document:

1. Read the applicable root from current topology.
2. Inspect current canonical identities of that kind.
3. Find the greatest valid numeric identity and propose the next value.
4. Check the proposed identity and destination case-insensitively immediately before
   writing.
5. Write directly to the current topology.

There is no persisted counter, lock, reservation, tombstone, or generator. Removing the
greatest current identity permits reuse of that number. Concurrent branches may allocate
the same ID; merge resolution owns that conflict.

If duplicate IDs already exist, offer reconciliation only when relevant: keep one ID and
move another to the next current value, merge overlapping knowledge, or remove obsolete
knowledge. Renames and moves may require link repair. Never reconcile without developer
authorization.

## Author the Web

Use ordinary relative Markdown or HTML links. Links express navigable relationships, not
authority:

```markdown
[Idempotent command](../../requirements/functional/FR-016-idempotent-command.md)
```

Do not invent custom protocols, write backlink lists, maintain a reverse index, or rely
on plain ID mentions as graph edges. If a file moves, search for its previous relative
path and propose repairs. Broken links remain focused maintenance evidence and do not
invalidate unrelated knowledge.

Across federation boundaries, an ordinary ancestor-to-descendant relative link may join
the composed graph. Do not author upward or cross-branch links expecting federation to
make them canonical.

## Keep Current Knowledge Current

Living records may be corrected, rewritten, split, merged, moved, or removed. Explain
material effects and update related current documents when authorized. Do not retain
discarded paths or superseded copies by default; Git is the historical recovery
mechanism.
