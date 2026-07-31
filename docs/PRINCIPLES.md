# Relic 2 development principles

This is conventional, project-owned governance for contributors to the Relic
repository. It lives outside the topology in `relic.yaml`; it is not a canonical
Relic document or a rule imposed on projects that use Relic.

## Product principles

### Knowledge is the product

Relic preserves the current shared knowledge that lets different developers and
agents reason from the same frontier. Specification-driven development is one
way to create that knowledge, not a mandatory lifecycle.

### The skill owns judgment; machinery owns deterministic work

The central skill confronts ambiguity, explores code and knowledge with native
agent tools, and proposes useful persistence. Code owns deterministic concerns
such as topology loading, safe parsing, link resolution, search, diagnostics,
installation, transport, and rendering.

Do not turn repeatable judgment into a command merely because it can be scripted.
Do not ask the skill to simulate infrastructure that must be stable and testable.

### The developer retains ownership

Relic may suggest a spec, requirement, decision, epic, shared document, or
reconciliation. It persists knowledge only when the developer asks or approves.
A developer may use Relic to investigate or fix code without producing a new
document.

Host projects own their `AGENTS.md`, principles, templates, governance, and
development process. Installation must not rewrite them.

### Current knowledge is living knowledge

Canonical documents represent the best current understanding. Superseded ideas,
discarded paths, and old revisions belong in Git unless the developer explicitly
wants their history kept as current knowledge.

Code is evidence of behavior; documents express accepted intent. When they
disagree, investigate and reconcile the affected boundary instead of declaring
either side universally authoritative.

### Topology is explicit and otherwise free

The root `relic.yaml` is the sole topology authority and contains topology only.
Its paths may use any project layout, including directories supplied through a
submodule. Relic follows those paths without owning the external repository or
requiring a `.relic` directory.

Record kinds are declared by the project as lowercase identity prefixes mapped to
Markdown roots. Relic may provide conventional defaults, but its core does not own a
closed FR/NFR/ADR/EPIC taxonomy. A declared `br`, `gl`, `risk`, or other kind is read by
the same deterministic path without adding parser branches or lifecycle rules.

Relative links are ordinary project links derived from the current topology.
Topology changes may require link maintenance; broken-link diagnostics make that
work visible without a link registry or migration engine.

### The corpus is a web, not a hierarchy

Specs and epics are common entry points, but no document type has universal
authority over another. Links spread context across specs, shared knowledge,
requirements, decisions, and delivery scope. Ambiguous or overlapping IDs may
be proposed for reconciliation, never repaired behind the developer's back.

### Authoring remains expressive; reading remains safe

Canonical records use Markdown. A specification has one canonical typed HTML
document; additional files in its directory are searchable artifacts, not
canonical knowledge nodes. Semantic components express structure while the
viewer owns style, color, and safe rendering.

Search and serve are read-only views of project knowledge. Malformed input,
unsafe paths, unsupported markup, and broken links should fail locally or
produce precise diagnostics rather than making the whole corpus unusable.

### The public surface stays small

The CLI has four commands:

- `init` creates only the minimal topology file;
- `install` installs or refreshes the central skill for discovered engines or
  one explicit engine;
- `search` queries current canonical knowledge and spec artifacts;
- `serve` starts the read-only local viewer.

Engine integrations remain thin, native installations of the same portable
skill. Target-specific metadata is isolated to its owner and must not change the
central behavior for other agents.

## Relic 1.x regression alarms

Stop and confront a proposal before implementation if it introduces any of the
following:

- a mandatory `specify -> clarify -> plan -> tasks` workflow or equivalent
  lifecycle state machine;
- modes, active specs, sessions, preambles, constitutions, or managed templates;
- a CLI command for validation, generation, records, engines, plugins, routing,
  orchestration, or any other agent judgment already expressible through the
  central skill;
- counters, high-water marks, ID locks, reservations, manifests, registries, or
  caches that can be derived from the current topology and filesystem;
- automatic document creation, status transitions, reconciliation, or
  persistence without developer ownership;
- fixed status vocabularies, required sections, or universal document schemas
  beyond the minimum needed to read a specific format;
- a second canonical representation, Markdown/HTML twins, generated knowledge,
  or synchronization machinery between equivalent documents;
- mutation of a host project's `AGENTS.md` or enforcement of project governance
  filenames;
- custom link protocols, authoritative backlink indexes, or migrations for
  normal relative project links;
- compatibility adapters or migration machinery whose main purpose is to retain
  Relic 1.x architecture;
- engine-specific behavior leaking into the portable skill or into another
  engine's installation;
- parser, topology, search, or filesystem logic duplicated in the viewer, CLI,
  Python wrapper, or skill.

An alarm is not a permanent ban on solving a real problem. It means the burden
of proof is on the new deterministic need, and the accepted current contracts
must change before code expands the product surface.

## Decision filter

Before adding code, state, configuration, or ceremony, ask:

1. Is this required to preserve or retrieve current shared knowledge?
2. Is it deterministic infrastructure, or can the central skill use the agent's
   native tools and judgment?
3. Can it be derived from `relic.yaml` and the current filesystem instead of
   stored as new state?
4. Does it work for ordinary host projects, or only make self-hosting easier?
5. Does it preserve developer ownership and remain useful without forcing a
   workflow?
6. Is a clean Relic 2 implementation smaller and clearer than adapting leftover
   Relic 1.x machinery?

Prefer the smallest design that keeps knowledge consultable, portable, and
honest. Simplicity is not the absence of structure; it is structure whose cost
is justified by the knowledge boundary it protects.
