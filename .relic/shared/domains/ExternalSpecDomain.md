# ExternalSpecDomain

**Type:** domain
**Owned by:** 009-external-spec-integration
**Confidence:** high

## Description

The external spec integration domain. Describes the model by which a project's implementation monorepo connects to a separate spec repository (typically a git submodule) that serves as the team-wide human-readable knowledge layer for PMs, designers, QA, and other non-technical stakeholders.

## Key Entities

- **External Spec Repository** — a standalone git repository containing specification documents. Relic may create and edit files in this repo. It must never delete files. All writes are expected to go through a branch+PR workflow: Relic operates on the current branch, commits, and the document owner reviews before merge.

- **Git Submodule** — the canonical deployment model. The external spec repo is added to the project monorepo as a git submodule via `relic external init`. The monorepo pins a specific commit; `git submodule update --remote` advances to the latest. Relic does not manage branching — branching is the team's workflow.

- **`config.external`** — a flat map in `.relic/config.json` from type key → directory path. Committed (not gitignored) — a team-wide convention. Paths are absolute or relative to the directory containing `.relic/`, resolved at runtime. Each key is one of the six supported document types:

  | Key | Document type |
  |---|---|
  | `fr` | Functional Requirement |
  | `nfr` | Non-Functional Requirement |
  | `br` | Business Requirement |
  | `adr` | Architecture Decision Record |
  | `us` | User Story |
  | `epic` | Epic |

  Any subset of types may be configured. Unconfigured types are unavailable. This design accommodates any existing spec repo layout without requiring migration.

- **`external_reads`** — an array in `artifacts.json` of `"<type>/<filename>"` strings. The type segment maps to `config.external.<type>`; the filename is the file's name within that directory. Relic resolves each entry to `config.external.<type>/<filename>`. Path traversal outside the configured directory is rejected as a hard error.

- **Document Types** — sequential ID format `<TYPE>-<NNN>-<slug>.md` (zero-padded 3 digits) written by `relic external create` into the type's configured directory. Slug derived from title: lowercase, hyphens, max 60 chars.

## Write Model

Relic has **create + edit** access to external type directories. It must never delete files.

| Operation | Trigger | Git action |
|---|---|---|
| Create document | `relic external create <type> <title>` | commit to spec repo (current branch) |
| Edit document | AI workflow command (clarify, plan) when contracts change | commit expected — not automated |
| Link existing | `relic external link <type>/<filename>` | none (updates local artifacts.json only) |

`relic external create` is the only operation that commits automatically. Manual edits during AI workflow sessions are expected to be committed by the team.

## Path Resolution

1. Load `config.external` from `config.json`.
2. For a given `<type>/<filename>` entry: look up `config.external.<type>`. If the type is not configured → hard error.
3. Resolve the type's path (relative to `.relic/` parent directory if relative).
4. Append `<filename>`. Verify the resolved path stays within the type directory (reject `../`).
5. Check existence: if the file is missing → hard error (not warning).

## Hard-Stop Validation

**Missing `external_reads` files are hard errors, not warnings.** A broken path in `external_reads` means the AI workflow command would operate without required context — this produces incorrect or incomplete output. All six workflow commands must validate every `external_reads` path before performing any other work. If any path is missing, the command stops immediately and lists the broken entries.

`relic validate` also reports missing paths as errors.

## Graceful Degradation

| State | Behaviour |
|---|---|
| `config.external` absent | External feature disabled; all commands continue normally |
| Type key not configured | `relic external create <type>` fails with clear error |
| Type directory missing | Warning on `relic external` browse; hard error if referenced in `external_reads` |
| Not a git repo (create) | File created; git commit step skipped with warning |

## Team Accessibility Model

The external spec repo is the primary interface for non-developer stakeholders:
- Human-navigable without tooling: sequential IDs, standard Markdown
- No Relic installation required to read
- No access to the code repository required
- PM/design/QA workflows: clone the spec repo, read/comment/PR directly there
- Directory layout is fully controlled by `config.external` — no forced Relic conventions

## Invariants

- `config.external` is always a committed value — never gitignored.
- Relic never deletes files from external type directories.
- `relic external create` always commits to the spec repo after creating a file.
- Missing `external_reads` paths are hard errors in all contexts (validate and workflow commands).
- Path traversal (`../`) in any `external_reads` entry is always a hard error.
- `relic external init` is the only Relic command that invokes `git submodule add`.

## Relationships

- Extends ProjectConfigDomain (spec 008) — `config.json` gains an `external` block
- Extends ArtifactsJsonContract — `artifacts.json` gains `external_reads[]`
- Extends ContextResultContract (spec 003) — `relic context` output gains `external` map
- Extends TemplateDomain (spec 001) — six new document templates embedded at build time
