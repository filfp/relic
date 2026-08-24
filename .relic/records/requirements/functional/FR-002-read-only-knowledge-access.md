---
id: FR-002
---

# Read-only knowledge access

Relic must provide one exhaustive read model over every canonical document declared by
the current topology and every artifact recursively contained by a specification.

Relic search must query canonical metadata and content plus supported textual artifacts.
Artifact results retain parent specification context and do not become canonical
document nodes.

Relic serve must expose the same model through a localhost-only, read-only frontend and
API. The catalog must include disconnected documents, relationships, backlinks,
artifacts, and localized maintenance diagnostics. Search and the frontend must agree on
canonical identities and artifact boundaries.

The accepted federation extension composes the selected root with explicitly declared
valid direct members. Search, API, and viewer must preserve the owning project as a
separate address field rather than deriving global document IDs. Projects without
federation retain current single-project response shapes. The composed view may derive
root-to-member canonical links and backlinks, but member graphs remain contained when
consulted independently. Federation is specified but not yet implemented.

The CLI surface is exactly:

- relic init;
- relic install;
- relic search;
- relic serve.

No validation, mode, workflow, record-generation, session, migration, or direct-model
command belongs to the product.

See the [knowledge model](../../../shared/SHARED-knowledge-model.md),
[safe consultability](../non-functional/NFR-002-safe-consultability.md), and the
[federation specification](../../../specs/002-relic-federation/index.html).
