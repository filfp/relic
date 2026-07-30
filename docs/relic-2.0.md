# Relic 2.0 — Conceptual Baseline

> **Status:** accepted product direction, 2026-07-29
> **Implementation status:** contract design in progress

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
location may be the Relic knowledge tree or another path declared by the project map in
`.relic/RELIC.md`.

These records are living descriptions of the current project. They may be corrected,
rewritten, moved, or removed as knowledge changes. Relic does not require superseded
copies to remain in the active documentation; Git retains their history.

Record creation is semantic rather than procedural. A small feature may justify one FR,
a structural choice may justify one ADR, and a larger delivery may justify an EPIC with
several requirements. No artifact type is required merely because development reached a
particular phase.

## Shared Knowledge and Relationships

`.relic/shared/` remains a first-class part of Relic. It contains knowledge that exists
independently from any one delivery artifact: domains, contracts, rules, assumptions,
and other project-defined knowledge that several specifications or records may need.
Relic does not require every project to use one universal internal taxonomy, but shared
knowledge must remain independently addressable and discoverable.

Specifications, FRs, NFRs, ADRs, and EPICs may reference shared knowledge and one
another. These relations are a first-class part of the product because they turn a
collection of documents into a navigable knowledge web. Search and the frontend may use
them to expose backlinks, related knowledge, and affected records.

Relations do not restore exclusive ownership or the Relic 1.x `owns`, `reads`, and
`touches_files` workflow. A document may be referenced by many other documents without
one specification controlling it, and incomplete relation metadata does not block
development. The exact reference and backlink representation belongs to the Relic 2.0
implementation contract.

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

The HTML is canonical for the specification's narrative and synthesis. FR, NFR, ADR,
and EPIC records remain canonical for the knowledge represented by their record type.
A specification may reference and summarize those records, but it must not create a
second normative definition that competes with them. A divergence is knowledge drift to
surface and resolve.

## Context Discovery and Project Governance

`.relic/RELIC.md` is the Relic-owned entry point for project knowledge. Relic owns its
path and format contract; the project owns the paths, roles, and sources declared in it.
The file gives agents the map needed to find the project's current documentation without
duplicating that documentation or prescribing how the rest of the repository must be
organized. The skill changes project-owned values only with developer authorization.

`RELIC.md` is the single authority for knowledge topology. A small structured frontmatter
declares corpus roots, typed-record locations, and governance sources so the CLI, search,
and frontend can discover them deterministically. Its Markdown body remains a free-form
guide for agents and developers. Topology is not copied into another configuration file.

`.relic/config.yaml` is deliberately narrower. It contains only the engines the project
expects Relic to manage and the high-water marks used to allocate stable sequential
identifiers. Engine-native files and directories are evidence of observed installation
state; they do not replace the project's declared engine set. The configuration contains
no corpus paths, governance mappings, presentation mode, SDD mode, viewer settings, or
cognitive workflow rules.

### Project file contract

`RELIC.md` has YAML frontmatter with one required `topology` mapping. All paths use `/`,
are relative to the repository root, and must resolve without escaping that root through
`..`. Its Markdown body has no prescribed structure. The minimum topology is:

```yaml
---
topology:
  specs: .relic/specs
  shared: .relic/shared
  records:
    fr: docs/requirements/functional
    nfr: docs/requirements/non-functional
    adr: docs/decisions
    epic: docs/epics
  governance:
    project:
      - PROJECT.md
    architecture:
      - TEMPLATE.md
    principles:
      - PRINCIPLES.md
---
```

The record roots and governance source lists are project-owned values. The `specs` and
`shared` roots remain the Relic-owned `.relic/specs/` and `.relic/shared/` locations.

`config.yaml` has exactly two top-level fields:

```yaml
engines:
  - codex
  - claude
high_water:
  spec: 0
  fr: 0
  nfr: 0
  adr: 0
  epic: 0
```

Every high-water value is a non-negative integer and begins at zero while its document
type is unused. Allocation uses the greater of the persisted mark and the identifiers
currently found in the corpus, then advances the mark. Duplicate identifiers remain a
validation error because counters alone cannot prevent two branches from allocating the
same identifier.

A missing or malformed `RELIC.md` prevents automated topology discovery and produces a
focused diagnostic. A missing or malformed `config.yaml` does not block knowledge reads,
search, or the frontend; it blocks engine installation and upgrade operations and new
numbered-ID allocation until corrected. A difference between configured engines and
observed engine-native installation files is a warning rather than a knowledge-read
failure.

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
- record metadata and identifier contracts;
- relation references and derived backlink contracts;
- the semantic HTML component contract;
- search indexing and freshness behavior;
- the boundary and modes of the central Relic skill;
- the reduced CLI command surface;
- plugin and multi-engine distribution;
- frontend and local-server implementation;
- migration or removal of the Relic 1.x codebase.

These decisions must be derived from the product model above. They may not restore a
mandatory workflow merely to preserve an existing implementation.

The ordered design and implementation sequence is recorded in
[`relic-2.0-work-order.md`](relic-2.0-work-order.md).
