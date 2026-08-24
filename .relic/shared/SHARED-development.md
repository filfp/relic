---
id: SHARED-development
---

# Relic implementation and validation map

Relic is a Bun workspace with four active implementation boundaries:

- packages/core owns topology loading, canonical parsing, relationships, diagnostics,
  search, and read-model projections. It has no CLI, HTTP, React, or engine dependency.
- packages/cli-node owns the four-command CLI, project discovery, the read-only local
  HTTP boundary, and embedded viewer delivery.
- packages/engines owns only project-local discovery, target-owned file selection, and
  failure-safe installation of the central skill from embedded distribution content.
- packages/viewer renders the core transport contract without independently parsing or
  interpreting project knowledge.

For the accepted federation extension, core owns independent parsing of local topology
and federation membership, traversal of explicitly declared member edges, hierarchical
project addresses, relationships, search, normalization, and diagnostics. CLI selection
still stops at the nearest project root and owns HTTP and safe artifact routing. The
viewer presents the composed tree, engines remain project-local, and the central skill
owns federated confrontation and authorized authoring. Federation is specified but not
yet implemented.

skills/relic is the complete distribution source of truth. Its portable contract is
shared by every target; optional host metadata is selected only for its owning target.
Engine-native copies are installations, never independently maintained product sources.

Use exact dependency versions and the hoisted Bun install configured at the workspace
root. The normal validation surface is:

    bun install --frozen-lockfile
    bun run lint
    bun run typecheck
    bun run test
    bun run test:distribution
    bun audit

Typecheck and test regenerate embedded skill and viewer assets, so clean checkouts do
not depend on ignored generated files. Distribution tests exercise the Node bundle,
compiled Bun binary, native skill roots, search, viewer lifecycle, and npm package
contents.

Releases publish the same four-command product through npm and platform-specific Python
wheels. The release workflow uses pinned actions, frozen dependency installation, and
trusted PyPI publishing.

See the [portability requirement](../records/requirements/non-functional/NFR-001-portable-stateless-operation.md),
the [release epic](../records/epics/EPIC-001-relic-2-release.md), and the
[federation specification](../specs/002-relic-federation/index.html).
