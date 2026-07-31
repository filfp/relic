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

### Central skill contract

The central skill is derived from the behavior evaluated in
[`architecture-roast-evaluation.md`](evidence/architecture-roast-evaluation.md). That
evaluation is behavioral evidence, not a workflow to reproduce step by step. Its value
comes from one generic reasoning protocol being useful during idea discovery,
specification readiness, architecture decomposition, implementation compliance,
operational analysis, fixes, and ordinary development without requiring a different
command or ceremony for each situation.

The skill surrounds the developer's current task instead of becoming a mandatory stage
before it. When asked to implement or fix something, it may consult knowledge, resolve
derivable questions, expose a material contradiction, and continue through code and
validation. When asked only for a roast, the analysis itself is the requested result.
Discovery, readiness, compliance, operational, and decomposition are optional internal
lenses, not modes the developer selects, ordered phases, or fixed output formats. The
skill may combine or omit them according to the target.

The amount of analysis is proportional to uncertainty, consequence, and reversibility.
A local change with clear intent should not receive a full architecture interrogation.
A change to authority, persistence, a public contract, security, or irreversible state
justifies deeper scrutiny. If established constraints leave only one coherent solution,
the skill derives and recommends it instead of turning it into a question. It stops for
the developer only when several valid choices materially change behavior, ownership,
authority, or scope.

The skill uses project knowledge progressively. It follows an existing `AGENTS.md`
route to Relic when present; otherwise it reads `.relic/RELIC.md` as its first Relic
context step. It then starts from the current target, follows relevant links, and uses
the frontend, Relic search, filesystem search, symbol search, or other engine-native
exploration according to need. It neither loads the entire corpus for every task nor
requires one exploration tool.

When a conversation creates or changes durable behavior, constraints, architecture,
responsibility boundaries, coordinated delivery scope, or reusable knowledge, the skill
may suggest persistence at a natural boundary. It first looks for an existing document
that should be corrected or extended and prefers that over creating duplicate
knowledge. A new specification, shared document, FR, NFR, ADR, or EPIC is suggested only
when the knowledge has a useful independent identity. A declined suggestion is not
repeated without new evidence. Investigations, discarded hypotheses, local
implementation details, and fixes that merely restore an already documented contract do
not automatically justify a record.

Persistence remains developer-owned. Explicit requests such as create, document,
record, or update authorize the named knowledge change. A confirmation also authorizes
the change when the skill's immediately preceding proposal stated the specific
documents it would create or update after confirmation. Agreement with a decision alone
does not otherwise authorize an unspecified write. Creating a requested numbered record
includes advancing its cooperative high-water mark. Authorization to change code does
not silently authorize new documentation; when implementation changes the current
knowledge frontier, the skill surfaces the affected documents and proposes their update.

The skill may keep a temporary decision ledger in the conversation during a long
analysis, covering confirmed and derived decisions, open forks, accepted risks,
deferrals, and affected documents. That ledger is not a Relic file, cache, session, or
source of truth. Cross-session continuity comes from developer-authorized living
knowledge or an explicitly requested handoff, never hidden conversation state.

A roast is complete when no remaining question changes the current contract or blocks
the requested scope. Future improvements, equivalent preferences, consciously accepted
risks, and implementation details do not keep it open. The central skill reduces the
decision space and helps the coding agent complete the requested work; it does not
replace the coding agent, orchestrate another prompt, own `AGENTS.md`, or require a
second invocation to proceed.

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

### Document identity and mutation contract

Relic metadata is required only for Relic-native knowledge: canonical specification
HTML, FRs, NFRs, ADRs, EPICs, and addressable documents under `.relic/shared/`.
Declared governance Markdown remains canonical by topology without adopting Relic
metadata. Specification support material remains a searchable artifact addressed by
repository-relative path rather than a canonical document node until the developer
deliberately synthesizes or moves its knowledge into a Relic document. Code, tests, and
ordinary project documentation outside declared topology remain available to agent-native
exploration rather than entering the Relic corpus implicitly.

The only required metadata field for native knowledge is its stable `id`. Every other
field is optional, project-defined, and opaque to the Relic core:

```yaml
---
id: FR-016
status: needs-review
owner: platform
confidence: low
---
```

Relic derives one or more corpus memberships from the roots declared by project topology
and can derive a display title from document content. An overlapping topology may place
the same physical document in several memberships without creating several document
nodes. Projects may still declare `kind`, `title`, `status`, `category`, or any other
useful metadata. Relic preserves and may present those values but does not define their
vocabulary, lifecycle, transitions, or validity.

The supported native kinds and canonical identifier forms are:

- specification: `001-auth`;
- functional requirement: `FR-001`;
- non-functional requirement: `NFR-001`;
- architecture decision: `ADR-001`;
- implementation epic: `EPIC-001`;
- shared knowledge: `SHARED-auth-api`.

Canonical prefixes retain their displayed case and identity comparisons are
case-insensitive so the same corpus behaves consistently across filesystems. The ID is a
stable catalog identity rather than an enforcement boundary: changing it makes the
previous identity disappear from ID lookup and introduces a new one. Path links remain
valid unless the file is also renamed or moved. Generated record filenames include the
ID and a readable slug, but document metadata carries the catalog identity. A
specification starts in a folder named by its ID; the same identity is carried by its
canonical HTML. The exact HTML metadata representation belongs to the semantic HTML
contract.

Relic imposes no status progression, revalidation rule, promotion rule, reclassification
procedure, or mutation lifecycle. Records may be rewritten, moved, split, merged, or
removed as the project's current knowledge changes. The skill may explain the effects of
a mutation and unresolved or ambiguous identities remain discoverable diagnostics, but
the project owns the change and its consequences. Removal creates no tombstone or
required superseded copy; Git retains history.

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
one specification controlling it, and incomplete or broken links do not block
development.

### Relationship and backlink contract

Links are edges in the knowledge web, not declarations of authority, ownership, or
hierarchy. The web spans the `RELIC.md` guide, each canonical specification HTML, and
canonical Markdown discovered through `.relic/shared/` and every governance or record
root declared by topology; spec artifacts and operational state elsewhere under
`.relic/` are not included automatically. A project may enter the web through any
canonical document. Specifications and EPICs are common navigation entry points because
they aggregate delivery knowledge, not because other documents are subordinate to them.
`RELIC.md` remains the bootstrap map for discovery.

Only explicit, ordinary file links create graph edges. Authors derive their relative
paths from the current topology:

```markdown
[Idempotent command](../../requirements/functional/FR-016-idempotent-command.md)
```

```html
<a href="../../requirements/functional/FR-016-idempotent-command.md">
  Idempotent command
</a>
```

Relic defines no custom link protocol and performs no ID-to-path resolution for authors.
Standard links work in Git hosts, editors, browsers, and coding agents without a Relic
integration. A relative link in a canonical document contributes an edge and backlink
when its target is another canonical node. A link to an artifact remains a file
reference, and links authored inside artifacts are not graph input. External URLs remain
ordinary outbound navigation. Plain ID mentions, code blocks, comments, search
similarity, arbitrary JSON or JavaScript, and visual labels without an actual link do
not create edges. Semantic visualizations that intend a relation must expose an ordinary
link through their component contract.

The read model resolves relative links from their source documents in order to derive
the graph; this generic read-side parsing is not a responsibility imposed on the central
skill. Missing local targets produce focused diagnostics without blocking unrelated
knowledge. The frontend presents a broken-link error at the source as evidence that the
document or topology needs maintenance. Fragments are preserved for navigation, but the
core does not govern or validate anchor names.

Backlinks are derived from discovered links and are never written into target documents
or maintained in a separate reverse index. Repeated links between the same source and
target express one graph connection, while the read model retains their link text,
fragment, and source context so the reason for that connection remains inspectable.
Self-links and same-document fragments remain local navigation rather than backlinks.
Search may suggest possible connections, but a suggestion becomes an edge only when the
project adds an explicit link.

Duplicate IDs do not make path links ambiguous, but they do make catalog and ID search
results ambiguous. The central Relic skill may offer a reconciliation: keep the ID on one
document and move another to the next cooperative high-water value, or merge or remove
overlapping knowledge. If reconciliation renames or moves a file, the skill may search
for the previous relative path and propose link repairs. It never renumbers a document,
advances the high-water mark, moves a file, or rewrites links silently; declining the
reconciliation leaves the ambiguity visible and otherwise usable.

## Specifications and Canonical HTML

Each specification has its own folder, but Relic imposes no fixed internal set of
Markdown documents. Supporting discussions, investigations, reports, references, and
other useful material may be organized according to the needs of that specification.

The one required specification document is its canonical HTML landing document. The
HTML is the agent-authored synthesis of the specification's current knowledge, not a
rendered copy that must be synchronized with a mandatory Markdown source. It is the
specification folder's only canonical Relic document. Other files in the folder are
artifacts: their supported textual content remains discoverable by search, but they do
not become catalog nodes, graph participants, backlinks, or additional rendered
specification documents. The canonical HTML does not need to repeat artifact content
merely to make it searchable.

Agents choose semantic structures such as flows, charts, tables, callouts, progress, and
other reusable visual components. The frontend owns their styling, colors, layout, and
interactive behavior. This gives the agent expressive tools without making it design the
presentation system for every document.

All knowledge-bearing components must expose indexable text and ordinary links in the
document structure. Essential knowledge may not exist only in JavaScript, canvas,
private component attributes, or a visual shape without textual content. Scripts,
styling, and progressive interaction belong to the frontend, keeping canonical HTML
readable to agents, search, accessibility tools, and code review.

### Semantic HTML contract

The canonical specification file is an HTML fragment with one required root whose `id`
matches the specification identity:

```html
<relic-body id="012-spec-viewer">
  <!-- free specification content -->
</relic-body>
```

No title, lifecycle field, or fixed section is required. Optional project metadata may
be carried as ordinary `data-*` attributes and remains opaque to Relic. The fragment
does not contain document chrome, navigation, scripts, styles, event handlers, iframes,
inline SVG, or canvas behavior. Those concerns belong to the frontend. A canonical
fragment is not required to render as a styled standalone web page when opened outside
Relic.

Standard semantic HTML is the default authoring vocabulary. Sections, headings, tables,
lists, links, figures, captions, details, definitions, blockquotes, images with
alternative text, code, and native progress elements do not require Relic wrappers.
Relic-specific elements exist only for useful progressive enhancement:

- `<relic-callout>` highlights a semantic note, risk, warning, or other project-defined
  concern;
- `<relic-flow>` turns readable textual flow notation into a visual flow;
- `<relic-chart>` enhances a child semantic table or list into a visualization;
- `<relic-chip>` presents a short neutral marker without imposing a status lifecycle.

Component attributes may provide rendering hints but may not be the only copy of
knowledge. In particular, tables are authored as HTML rather than JSON attributes, and
chart values remain present in a child table or list. Flow source remains textual and
indexable. A visual connection contributes a knowledge-web edge only when its document
structure also contains an ordinary link.

Callout kinds and other visual hints are open project vocabulary. The frontend may give
known values specialized presentation and must render unknown values neutrally. It does
not infer lifecycle, validity, completion, or authority from status-like text.

Rendering is tolerant and security-bounded. Safe semantic HTML renders normally. Known
Relic components receive enhanced presentation. An unknown or malformed `relic-*`
component preserves readable child content and produces a focused diagnostic instead of
breaking the page. Unsafe executable or presentation-owned content is not executed and
also produces a diagnostic. The same fragment interpretation feeds indexing,
validation, and frontend rendering so a component cannot silently expose different
knowledge to each surface.

The frontend derives catalog metadata, backlinks, diagnostics, related documents, and
supporting-file navigation outside the authored fragment. Canonical HTML therefore has
no generated `spec-meta`, tasks, artifacts, changelog, backlink, or relation-index
components. It also has no mandatory overview, requirements, plan, tasks, or artifacts
anatomy.

HTML is the only Relic specification mode. Relic 2.0 has no Markdown/HTML mode selector
and no dual-format synchronization lifecycle.

The HTML is the canonical landing representation for its specification, not a higher
authority over connected knowledge. FRs, NFRs, ADRs, EPICs, shared documents, and specs
are peer nodes in the web. When documents disagree, their kinds do not select a winner;
the divergence is knowledge drift for the developer and skill to surface and resolve.

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
`..`. Its Markdown body is otherwise free-form but carries the small authoring rule for
numbered records: read the current high-water value from `config.yaml`, follow the
current topology, write directly, and advance the cooperative mark. The minimum topology
is:

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
Relic follows the declared topology without rejecting overlapping roots or inventing a
precedence between them. If a project maps the same physical file into several corpora,
the read model exposes one document node with several memberships. Changing topology is
an infrequent project decision and may orphan relative links. Relic does not migrate them
automatically; broken-link diagnostics and ordinary text search provide the evidence for
an agent-assisted maintenance session.

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
type is unused. When the developer requests a numbered document, the central skill reads
the current topology and high-water value, writes the document directly to the declared
root, and advances the mark. `RELIC.md` carries this small authoring instruction; Relic
does not require a separate record skill, JSON input, generator script, or CLI command.
The mark is a cooperative convenience, not a lock or distributed reservation system.
Concurrent branches or worktrees may allocate the same identifier; merge resolution owns
that conflict. Duplicate identities remain focused diagnostics and do not make unrelated
knowledge unreadable.

A missing or malformed `RELIC.md` prevents automated topology discovery and produces a
focused diagnostic. A missing or malformed `config.yaml` does not block knowledge reads,
search, the frontend, or manual document creation; it blocks engine installation and
upgrade operations and Relic-managed automatic ID allocation until corrected. A
difference between configured engines and observed engine-native installation files is a
warning rather than a knowledge-read failure.

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

## Consultability Contract

Freedom of authorship is paired with deterministic reading. Relic has two semantic
document parsers:

- the typed HTML parser for each specification's canonical landing document;
- the Markdown parser for `RELIC.md`, declared governance, shared knowledge, and FR,
  NFR, ADR, and EPIC roots.

These parsed files are canonical document nodes. Other discovered files are artifacts,
including additional Markdown or text files inside a specification folder. Supported
text artifacts participate in query-time full-text discovery and may have snippets, but
they are not semantically parsed into metadata, links, backlinks, or graph nodes. This
text extraction is not a third document grammar. Binary or otherwise non-textual
artifacts remain visible from their containing specification or corpus location without
silently becoming knowledge documents.

Operational configuration, generated caches, and other Relic machinery are not
knowledge or searchable artifacts merely because they live under `.relic/`. Overlapping
roots map each canonical physical document to one node with several memberships rather
than duplicating it. Artifacts are likewise deduplicated for listing and search without
being promoted to nodes.

Every canonical node is available through an exhaustive catalog organized by membership
and path, including orphaned documents with no incoming or outgoing edges. Specs and
EPICs are useful entry points, but no node depends on them for discovery. Artifact search
results identify their path, containing specification or corpus location, and matching
snippet; they do not create an independent canonical-document page.

The read model derives a document display label from optional metadata, document title
or first heading, ID, and finally filename. It preserves arbitrary metadata without
interpreting its vocabulary. Search is a core, full-text capability across canonical
documents and supported textual artifacts and can display paths, memberships, IDs,
metadata, parent context, and snippets where applicable. Agents are never forced to use
it as their only exploration mechanism.

Catalogs, graph edges, backlinks, snippets, diagnostics, and search indexes are derived
projections. Source files remain authoritative for their own content. A cache may improve
performance but may never become the only copy of knowledge or silently return an
incomplete corpus when stale. Broken links, duplicate IDs, unsupported content, and
orphaned nodes remain visible, non-blocking maintenance evidence in both the read model
and frontend.

## Frontend and Local Read Surface

The frontend is a disposable, read-only projection of the current read model. Source
files remain authoritative for their own content; the frontend does not create, edit,
renumber, repair, approve, or persist project knowledge. It has no active specification,
active fix, document lifecycle, validity state, or resolved-diagnostic state.
Presentation-only browser preferences such as theme and filters may remain local to the
browser and never enter project files.

Canonical navigation uses normalized repository-relative document paths rather than
Relic IDs. IDs remain searchable labels and may route to a disambiguation result, but
duplicate IDs cannot make a path-addressed page ambiguous. A moved document may
therefore invalidate an old browser bookmark just as it may invalidate an authored
relative link; no persistent route registry is maintained.

The frontend consumes the core read model instead of independently interpreting source
files. The typed HTML and Markdown parsers produce the semantic representations used for
rendering, text discovery, metadata, links, and diagnostics. A raw-source view may show
original content without becoming a second parser or relation source.

Its primary surfaces are:

- an exhaustive catalog of canonical documents, with search, memberships, paths, and
  raw project metadata;
- one generic document page that renders typed spec HTML or canonical Markdown and shows
  outgoing links, backlinks, memberships, local graph neighborhood, and focused
  diagnostics;
- specification pages that render only the canonical typed HTML and list other folder
  files as artifacts;
- search results that include matching textual artifacts with their parent context and
  snippets without presenting them as canonical documents;
- an optional filtered global graph, while catalog and local neighborhoods remain the
  primary navigation;
- the semantic component reference for the installed frontend version.

An artifact may be downloaded or safely previewed as raw local content, but the frontend
does not render it as another specification document. Links inside artifacts do not
create graph edges. A canonical document's link to an existing artifact remains a file
reference rather than a document edge.

The read model resolves authored relative links from their source files before the
frontend renders them. It retains the original reference, resolved target, fragment,
link text, and source context. Links to canonical nodes navigate through their
path-addressed frontend route; missing targets receive localized chiplets; existing
project files outside the corpus remain outside the graph and are not exposed through
arbitrary filesystem reads.

Diagnostics are maintenance evidence rather than a global valid/invalid verdict. The
frontend presents them at the affected document or reference and may provide a global
maintenance overview. A partially readable project still opens: when topology prevents
catalog construction, the application shell presents the focused bootstrap diagnostic
instead of collapsing into an opaque server error.

The local API is an internal transport shipped and versioned with the frontend, not an
independent public compatibility contract. It exposes the project summary, canonical
catalog, path-addressed node details, search results, graph relations, diagnostics, and
safe artifact access needed by that bundled client. It has no spec-, fix-, task-, mode-,
or validation-specific authority.

The server accepts read-only requests, binds locally by default, stores no lifecycle
file, and reflects filesystem changes without requiring a process restart. It does not
execute corpus scripts or automatically fetch external images, embeds, or other remote
content. Relative images and attachments inside the discovered project boundary may be
served safely; external URLs remain explicit user navigation.

## Minimal CLI Contract

The Relic 2.0 CLI has four product commands:

```text
relic init
relic install [--engine <engine>]
relic search <query>
relic serve
```

Ordinary help and version output are executable conventions rather than additional
product workflows. The CLI does not create or number knowledge documents, select active
context, maintain sessions, invoke models, execute prompts, choose a specification mode,
write changelogs, migrate Relic 1.x, or determine how an agent reasons.

`relic init` creates the smallest project foundation: `.relic/RELIC.md`,
`.relic/config.yaml`, `.relic/specs/`, and `.relic/shared/`. The initial engine list is
empty and the generated `RELIC.md` uses the documented default topology. Initialization
does not create project governance documents, write `AGENTS.md`, or overwrite an
existing `RELIC.md` or `config.yaml`. There is no force-reinitialization path.

`relic install` reconciles the engine integrations already declared in `config.yaml`.
With `--engine <engine>`, it first validates the engine and existing configuration,
adds the engine to the declared list without duplication, and installs or refreshes that
engine's Relic skill. The configuration is desired project state; engine-native skill
directories are observed installation state. If installation fails after the desired
engine is recorded, the declaration remains and the mismatch is reported so the same
command can repair it later. An engine removed from the configuration is not
automatically deleted from its native directory. The command never modifies `AGENTS.md`
or updates the Relic binary itself.

`relic search` queries the complete currently discovered corpus rather than the Relic
1.x manifest, fix, or active-spec indexes. IDs, paths, labels, metadata, memberships, and
supported text content participate in discovery. Human-readable output is the default
and `--json` exposes the same result model for agents and automation. Search has no
`--deep` distinction that can silently omit part of the corpus.

`relic serve` starts the local read-only frontend and knowledge API. It accepts an
optional port override and otherwise chooses an available local port, but stores no
viewer preference or process state in the project. When topology or content is partially
readable, the frontend remains available and presents focused global or document
chiplets for broken paths, duplicate IDs, malformed native documents, unsupported
content, and other read-model diagnostics.

Relic 2.0 has no `validate` command. Removing that command does not remove parsing or
diagnostics: the read model detects structural problems for every consumer, the frontend
is their primary presentation surface, and the central skill inspects knowledge it
writes against the active contracts. Search and the frontend preserve usable knowledge
when diagnostics are local; a command fails only when its requested operation cannot be
performed, such as when no Relic project can be found or topology cannot be read enough
to discover a corpus. Diagnostics are evidence for maintenance, not a second enforcement
system.

Only `init` and `install` mutate project or engine state. `search` and `serve` are
read-only. The legacy `add-engine` and prompt-refresh part of `upgrade` are absorbed by
`install`; self-upgrade remains the responsibility of the package distribution channel.
The workflow, session, context, scaffold, write, mode, migration, external-integration,
snippet, and active-fix commands are removed. MCP is not part of the minimal CLI and may
return only if distribution work demonstrates a material knowledge-access benefit not
provided by files, search, and the frontend.

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

- plugin and multi-engine distribution;
- migration or removal of the Relic 1.x codebase.
- self-hosting this repository before the Relic 2.0 capabilities are operational on an
  isolated fixture or pilot.

These decisions must be derived from the product model above. They may not restore a
mandatory workflow merely to preserve an existing implementation.

The ordered design and implementation sequence is recorded in
[`relic-2.0-work-order.md`](relic-2.0-work-order.md).
