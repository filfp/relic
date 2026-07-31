---
id: EPIC-001
status: in-progress
---

# Relic 2.0 release

Deliver the clean skill-first Relic replacement without a 1.x compatibility layer.

Completed scope:

- pure topology-driven knowledge read model and semantic parsers;
- exhaustive search, graph, backlinks, artifacts, and localized diagnostics;
- read-only bundled viewer and localhost API;
- central skill plus native Claude, Copilot, and Codex installers;
- minimal init, install, search, and serve CLI;
- self-contained npm, Bun binary, and platform wheel distribution;
- deletion of executable 1.x workflows, plugin, templates, sessions, modes, and
  manifests;
- curated self-hosted 2.0 knowledge corpus.

Remaining release gate:

- install the central skill into this repository's native engine roots;
- verify search, frontend routes, graph, package contents, tests, types, lint, audit, and
  release metadata against the self-hosted corpus;
- remove the temporary architecture-roast and requirement-record development skills;
- perform an owner visual pass before publication.

See the [product specification](../../specs/001-relic-2/index.html),
[implementation map](../../shared/SHARED-development.md), and
[portability requirement](../requirements/non-functional/NFR-001-portable-stateless-operation.md).
