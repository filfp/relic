# Relic 2.0 — Conceptual Baseline

> **Status:** accepted product direction, 2026-07-29
> **Implementation status:** not designed

This document records the approved product model for Relic 2.0. It defines what the
product is and which Relic 1.x assumptions no longer apply. It is intentionally not an
implementation plan, migration plan, CLI design, or compatibility contract.

## Product Identity

Relic is infrastructure for producing, preserving, discovering, and presenting the
current project knowledge used by coding agents and their developers.

Spec-driven development is one way that knowledge is created. It is not a mandatory
workflow and does not impose a fixed sequence such as specify, clarify, plan, tasks, and
implement. The value of Relic is the durable shared knowledge, not evidence that a
ceremony was completed.

Relic is designed for collaboration. Different developers and agents working from the
same repository should have access to the same current project context.

## Developer-Owned Persistence

A central Relic skill provides the reasoning practice proven by the architecture-roast
workflow. It can challenge an idea, isolate a specification, decompose an epic, assess
readiness, inspect operational failure modes, or compare implementation with documented
intent.

The skill may recognize that a discussion is producing durable knowledge and suggest an
appropriate record: a specification, FR, NFR, ADR, or EPIC. It never creates that record
silently. The developer decides when a working conversation becomes project
documentation and which artifact represents it.

Using Relic as context does not create a documentation obligation. A developer may use
the knowledge base and the roast process to implement a fix without producing a fix
document. Existing documentation is updated only when the current knowledge itself
changes or becomes inaccurate.

## Authority and Drift

The current prompt and explicit developer intent define the work being performed. The
code is authoritative evidence of the system's present behavior. Documentation captures
the current best knowledge of intent, contracts, decisions, and project structure; it
does not override the code merely because it is older and written down.

A divergence between code and documentation is classified from current evidence rather
than resolved by a universal precedence rule. A reported bug may require changing both
the code and the affected documentation. An obsolete document may instead be updated to
match intentional behavior already present in the code.

Relic preserves the current knowledge frontier by default. Discarded alternatives,
superseded paths, failed attempts, and resolved questions remain outside the active
knowledge unless the developer explicitly decides they are still useful. Git is the
historical recovery mechanism.

## Living Records

FR, NFR, ADR, and EPIC records live independently from specification folders. Their root
location may be the Relic knowledge tree or a path selected by project configuration.

These records are living descriptions of the current project. They may be corrected,
rewritten, moved, or removed as knowledge changes. Relic does not require superseded
copies to remain in the active documentation; Git retains their history.

Record creation is semantic rather than procedural. A small feature may justify one FR,
a structural choice may justify one ADR, and a larger delivery may justify an EPIC with
several requirements. No artifact type is required merely because development reached a
particular phase.

## Specifications and Canonical HTML

Each specification has its own folder, but Relic imposes no fixed internal set of
Markdown documents. Supporting discussions, investigations, reports, references, and
other useful material may be organized according to the needs of that specification.

The one required specification artifact is its canonical HTML document. The HTML is the
agent-authored synthesis of the specification's current knowledge, not a rendered copy
that must be synchronized with a mandatory Markdown source.

Agents choose semantic structures such as flows, charts, tables, callouts, progress, and
other reusable visual components. The frontend owns their styling, colors, layout, and
interactive behavior. This gives the agent expressive tools without making it design the
presentation system for every document.

HTML is the only Relic specification mode. Relic 2.0 has no Markdown/HTML mode selector
and no dual-format synchronization lifecycle.

## Context Discovery and Project Governance

`.relic/RELIC.md` is the Relic-owned entry point for project knowledge. It gives agents
the map needed to find the project's current documentation without duplicating that
documentation or prescribing how the rest of the repository must be organized.

The project's `AGENTS.md` remains entirely project-owned. Relic never creates, rewrites,
or maintains a managed section in it. A project may choose to reference
`.relic/RELIC.md` from `AGENTS.md`, but that reference is not the mechanism by which the
central Relic skill is installed or discovered.

The skill is discovered through the coding agent's native skill mechanism. When invoked,
it first checks whether the project's `AGENTS.md` already routes the agent through
`.relic/RELIC.md`. If it does not, the skill reads `.relic/RELIC.md` as its first Relic
context step.

Relic recognizes three governance responsibilities without requiring three specific
files:

1. **Project and domain** — product identity, purpose, domain language, and business
   rules.
2. **Architecture and structure** — system boundaries, responsibility placement,
   composition, and code organization.
3. **Execution principles** — implementation practice, testing, verification, quality,
   and delivery rules.

A project may satisfy each responsibility with one document, several focused documents,
or an existing documentation hierarchy. Names such as `PROJECT.md`, `TEMPLATE.md`, and
`PRINCIPLES.md` are useful conventions, not required filenames. A missing responsibility
is a knowledge gap the skill may surface and offer to document; it is not a Relic
validation failure.

Relic retains specialized search for large projects. Search supplements the native
exploration capabilities of each coding agent; it is not a mandatory gateway and does
not prohibit filesystem traversal, grep, ripgrep, symbol search, or other engine-native
techniques.

## Relic 1.x Constraints Removed

Relic 2.0 does not preserve the following requirements:

- a fixed specify → clarify → plan → tasks → implement lifecycle;
- mandatory `spec.md`, `plan.md`, `tasks.md`, and `artifacts.json` files;
- an active spec or active fix session;
- a mandatory fix → solve documentation pipeline;
- a non-amendable preamble governing agent behavior;
- a generated constitution that outranks observed code;
- exclusive artifact ownership by one specification;
- mandatory Relic search before other exploration;
- mandatory changelog entries for every knowledge mutation;
- automatic documentation creation or closure by ambient skills;
- dual Markdown and HTML specification modes;
- backward compatibility with Relic 1.x layouts, commands, plugins, or workflows.

This removal does not prohibit small deterministic format contracts required for tools
and agents to share records, search results, configuration, and semantic HTML. Those
contracts belong to the Relic 2.0 implementation design and must not reintroduce a
mandatory development methodology.

## Deliberately Deferred

The following decisions are intentionally outside this conceptual baseline:

- the final repository and configurable directory layout;
- the exact content and format contract of `.relic/RELIC.md`;
- record metadata and identifier contracts;
- the semantic HTML component contract;
- search indexing and freshness behavior;
- the boundary and modes of the central Relic skill;
- the reduced CLI command surface;
- plugin and multi-engine distribution;
- frontend and local-server implementation;
- migration or removal of the Relic 1.x codebase.

These decisions must be derived from the product model above. They may not restore a
mandatory workflow merely to preserve an existing implementation.
