---
id: NFR-001
---

# Portable stateless operation

Relic must give Codex, Claude, Copilot, and future supported agents the same repository
knowledge and central reasoning contract through each engine's project-local native
skill location.

Installation must not edit AGENTS.md, project documentation, or desired-state
configuration. Explicit engine installation changes only the selected engine; discovery
refreshes every already-present supported root. Refresh must stage complete content and
preserve or recover the previous Relic skill when replacement fails.

Knowledge operations must not depend on hidden sessions, active-spec selection, process
state, manifests, counters, locks, reservations, or ambient chat history. Search and
serve are read-only. A later session must recover current context from repository
knowledge and code.

npm bundles, compiled Bun binaries, and platform Python wheels must embed the same skill
and viewer without requiring the source checkout.

See the [implementation map](../../../shared/SHARED-development.md) and
[skill-first architecture](../../decisions/ADR-001-skill-first-stateless-architecture.md).
