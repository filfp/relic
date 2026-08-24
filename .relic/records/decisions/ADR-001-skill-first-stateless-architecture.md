---
id: ADR-001
---

# Skill-first, stateless architecture

Relic uses one generic central skill as its reasoning layer and a thin four-command CLI
as deterministic infrastructure. The CLI initializes topology, installs the skill,
searches knowledge, and serves the frontend; it does not orchestrate agent cognition.

The central skill absorbs the useful behavior of architecture roast and direct record
authoring. Separate specify, clarify, plan, tasks, implementation, fix, validation,
record-generation, and routing workflows are removed rather than adapted.

Project knowledge is shared through committed files. Project-local engine directories
are installation evidence. AGENTS.md remains entirely project-owned: it may link to
Relic but is neither required for skill installation nor modified by Relic.

This decision deliberately trades mandatory workflow enforcement for developer
ownership, progressive context discovery, and natural agent interaction. Deterministic
reading, tests, diagnostics, and the frontend preserve consultability without restoring
workflow machinery.

The accepted federation extension preserves that split. The skill reads a dedicated
federation reference only when the selected relic.yaml declares federation, then uses
relevant root and direct-member knowledge for confrontation and developer-authorized
authoring. Deterministic federation parsing, addressing, normalization, links, search,
transport, and diagnostics remain machinery. Selection never climbs above the nearest
project authority, and no cognitive or mutation pipeline is added.

See the [product specification](../../specs/001-relic-2/index.html),
[skill workflow requirement](../requirements/functional/FR-001-skill-first-knowledge-workflow.md),
[portability requirement](../requirements/non-functional/NFR-001-portable-stateless-operation.md),
and the [federation specification](../../specs/002-relic-federation/index.html).
