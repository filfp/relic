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

Federation composes the selected root with every valid project
transitively reached through explicit member declarations. Search, API, and viewer must
preserve the owning project as a hierarchical address path rather than deriving global
document IDs. Projects without federation retain current single-project response shapes.
The composed view may derive ancestor-to-descendant canonical links and backlinks, but a
nested project selected independently exposes only its own graph and federation subtree.

The CLI surface is exactly:

- relic init;
- relic install;
- relic search;
- relic serve;
- relic verify.

`relic verify` must read the selected aggregate without mutation and report every
read-model warning and error. Its diagnostics include a project-address-qualified
warning for every relative link authored by a reached member that leaves that member's
project boundary, including upward and cross-branch targets. The same diagnostic must
be present in federated search and serve results. It must not label the root project's
links, external URLs, or other unsafe link forms as federation outbound links. Any
reported warning or error makes the command exit unsuccessfully so a gate can require
repair.

No validation workflow, mode, record-generation, session, migration, or direct-model
command belongs to the product. Verify is deterministic read-model inspection, not an
agent workflow or a knowledge mutation surface.

See the [knowledge model](../../../shared/SHARED-knowledge-model.md),
[safe consultability](../non-functional/NFR-002-safe-consultability.md), and the
[federation specification](../../../specs/002-relic-federation/index.html).
