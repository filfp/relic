---
id: NFR-001
---

# Portable stateless operation

Relic must give Codex, Claude, Copilot, standards-based agents, and future supported
hosts the same repository knowledge and central reasoning contract through each
project-local skill location. Portable files are shared; host-specific metadata must
be confined to the target that owns and interprets it.

Installation must not edit AGENTS.md, project documentation, or desired-state
configuration. Explicit engine installation changes only the selected engine; discovery
refreshes every already-present supported root. Refresh must stage complete content and
preserve or recover the previous Relic skill when replacement fails.

Knowledge operations must not depend on hidden sessions, active-spec selection, process
state, manifests, counters, locks, reservations, or ambient chat history. Search and
serve are read-only. A later session must recover current context from repository
knowledge and code.

Federation must preserve the same stateless boundary. Relic selects only the nearest
project authority and never searches ancestors for a parent federation or descendants
for undeclared members. It follows explicit federation edges transitively from the
selected root, loading each reached project realpath at most once. Work is bounded by the
reachable declared graph rather than repository size. Process-local derived caching is
allowed, but no persisted or authoritative federation cache, registry, or synchronization
state may participate in discovery.

npm bundles, compiled Bun binaries, and platform Python wheels must embed the same skill
and viewer without requiring the source checkout.

See the [implementation map](../../../shared/SHARED-development.md),
[skill-first architecture](../../decisions/ADR-001-skill-first-stateless-architecture.md),
and the [federation specification](../../../specs/002-relic-federation/index.html).
