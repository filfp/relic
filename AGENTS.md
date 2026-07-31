# Contributing to Relic as an agent

This file is the project-owned entry point for agents changing the Relic
repository. It is not a guide for using the Relic skill and it does not replace
the durable contracts in the Relic corpus.

## Read before changing anything

Use the smallest route that covers the work:

- Read [`.relic/PROJECT.md`](.relic/PROJECT.md) to locate ownership, package
  boundaries, generated files, and the correct home for a change.
- Read [`.relic/PRINCIPLES.md`](.relic/PRINCIPLES.md) before changing product
  behavior or architecture. Its regression alarms protect the Relic 2 design
  from growing back into Relic 1.x.
- Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for repository commands, validation,
  knowledge changes, and release preparation.
- Read [`SECURITY.md`](SECURITY.md) when work touches paths, parsing, served
  content, installation, dependencies, or another trust boundary.
- Read [`relic.yaml`](relic.yaml) and the relevant canonical documents it
  locates when work changes a requirement, decision, specification, delivery
  scope, or reusable project knowledge.

`AGENTS.md` is a router. Keep detailed contracts in their owning documents
instead of copying them here.

## Route work by concern

| Concern | Start here | Also inspect |
| --- | --- | --- |
| Topology, parsing, links, search, diagnostics | `packages/core` | Knowledge-model contracts and core fixtures |
| Commands, project discovery, HTTP API, distribution | `packages/cli-node` | CLI tests, package README, release scripts |
| Skill installation or engine discovery | `packages/engines` | `skills/relic`, engine tests |
| Browser behavior and presentation | `packages/viewer` | Viewer tests and `NFR-002` |
| PyPI distribution | `packages/cli-python` | Native-binary build and wheel verification scripts |
| Skill behavior or authoring guidance | `skills/relic` | Its references and `FR-001` |
| CI or publishing | `.github/workflows`, `scripts` | `CONTRIBUTING.md`, changelog, release epic |

## Working rules

- Preserve package boundaries. Put cognition in the skill, deterministic
  knowledge interpretation in core, orchestration in the CLI, and presentation
  in the viewer.
- Treat `skills/relic` as the source of the distributed skill. Generated
  embeddings and installed copies are outputs, not independent sources.
- Do not add a fifth CLI command without changing the accepted product
  contracts first. The public command surface is `init`, `install`, `search`,
  and `serve`.
- Do not make Relic own or rewrite a host project's `AGENTS.md`, governance, or
  development process.
- Preserve unrelated work in a dirty tree. Do not discard, rewrite, commit, or
  push user changes unless the current request authorizes it.
- Prefer `rg` for discovery and make focused edits. Validate the narrowest
  affected layer, then run the broader gates required by `CONTRIBUTING.md` when
  the change crosses packages or distribution boundaries.
- Update durable Relic knowledge only when the developer asks for persistence
  or approves it. The current code is evidence; canonical documents describe
  current intent and must not silently contradict it.

## Definition of done

A change is complete when its behavior, tests, generated outputs, documentation,
and durable contracts agree at the affected boundary. Report exactly which
checks ran and distinguish source validation from distribution validation.

