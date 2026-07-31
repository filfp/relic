---
id: EPIC-001
status: ready-for-owner-verification
---

# Relic 2.0 release

Deliver the clean skill-first Relic replacement without a 1.x compatibility layer.

Completed scope:

- pure topology-driven knowledge read model and semantic parsers;
- exhaustive search, graph, backlinks, artifacts, and localized diagnostics;
- read-only bundled viewer and localhost API;
- central skill plus native Claude, Copilot, Codex, and portable agents installers;
- minimal init, install, search, and serve CLI;
- self-contained npm, Bun binary, and platform wheel distribution;
- deletion of executable 1.x workflows, plugin, templates, sessions, modes, and
  manifests;
- curated self-hosted 2.0 knowledge corpus.
- installation of the same portable contract in the repository's Claude, Codex, and
  agents roots, with OpenAI metadata confined to Codex, followed by removal of the
  construction-only architecture-roast and requirement-record skills;
- clean lint and type checks, 76 passing tests, zero dependency vulnerabilities, and a
  passing Node bundle, compiled Bun binary, native-engine, viewer, and npm package trial;
- live self-hosted viewer evidence: 12 canonical documents, zero diagnostics, zero
  orphans, 10 outgoing spec links, four spec backlinks, and all 11 peer nodes related.

Remaining release gate:

- perform an owner visual pass of the catalog and canonical specification;
- prepare the chosen release version and dated changelog entry before publication.

See the [product specification](../../specs/001-relic-2/index.html),
[implementation map](../../shared/SHARED-development.md), and
[portability requirement](../requirements/non-functional/NFR-001-portable-stateless-operation.md).
