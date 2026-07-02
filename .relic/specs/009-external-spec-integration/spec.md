# Spec: External Spec Integration

**Spec ID:** 009-external-spec-integration
**Created:** 2026-05-20
**Status:** implemented

---

## Overview

Enterprise teams maintain a canonical spec repository separate from their implementation repositories — typically containing Functional Requirements (FR), Non-Functional Requirements (NFR), Business Requirements (BR), User Stories, Architecture Decision Records (ADR), and Epics owned by the business or a platform team. Today Relic has no way to know this repo exists, so AI workflow commands operate without that context: a plan is written without the FR that constrains it, a spec is scoped without the ADR that governs the architecture, and a fix is diagnosed without the business rule that was violated.

This spec introduces **External Spec Integration** — a mechanism that treats the external spec repository as a first-class git submodule of the project monorepo. Relic learns where the submodule lives via `config.json`, surfaces it to AI agents via `relic context`, allows developers to **create new documents** (FRS, NFRS, BRS, ADRS, etc.) in the external spec repo directly from their workflow, ties those documents to their active spec via `external_reads`, and loads the linked documents automatically during every relevant workflow command.

The external spec repo serves as the team-wide readable knowledge layer: PMs, designers, and QA read it directly from the spec repository without ever touching the implementation repo. When new specs or updates are committed to the external repo, the monorepo owner simply runs `git submodule update --remote` to advance the pinned reference and distribute the latest spec version to the entire team.

---

## Requirements

### Functional Requirements

- **FR-1:** `config.json` must support an optional `external` block that is a flat map of type key → directory path. Keys are the six known document types: `fr`, `nfr`, `br`, `adr`, `us`, `epic`. Each value is an absolute path or a path relative to the directory containing `.relic/`. Any subset of types may be configured — unconfigured types are simply unavailable.
- **FR-2:** `relic init` must accept optional `--external-<type> <path>` flags (e.g. `--external-fr ./specs/fr`, `--external-adr ./docs/decisions`) that write the corresponding entry into `config.external` during project initialisation. At least one type must be specified to create the `external` block.
- **FR-3:** A new `relic external [--text]` command must report each configured type's directory path, whether it exists on disk, and a one-level file listing. Types not configured are omitted. If no types are configured, the command reports `{ "configured": false }`.
- **FR-4:** `relic context` JSON output must include an `external` field: a map from configured type keys to `{ "path": string, "resolved_path": string, "exists": boolean }`. Unconfigured types are omitted. If `config.external` is empty or absent, the field is `{ "configured": false }`.
- **FR-5:** `artifacts.json` must support an optional `external_reads` array — a list of `"<type>/<filename>"` strings where `<type>` is one of the configured type keys and `<filename>` is the file's name within that type's configured directory (e.g. `"fr/FR-001-auth.md"`, `"adr/ADR-012-session-store.md"`). Relic resolves each entry to `config.external.<type>/<filename>`.
- **FR-6:** `relic context --spec <id>` must include the resolved `external_reads` paths in its output, with an `exists` field per entry and the full `resolved_path` for each.
- **FR-7:** `relic validate` must check that every path in `external_reads` resolves to an existing file. Missing files are reported as **errors** (not warnings) — a broken `external_reads` entry renders the spec's AI workflow commands unreliable. Additionally, every AI workflow command that loads `external_reads` files must validate all paths before performing any other work; if any path is missing, the command must stop immediately and report the broken paths to the user.
- **FR-8:** AI workflow prompt templates (`specify.md`, `clarify.md`, `plan.md`, `tasks.md`, `implement.md`, `fix.md`) must include a step that reads each `external_reads` file before performing their main work. The LLM reads these files to incorporate their constraints, decisions, and language into the output.
- **FR-9:** `relic external set <type> <path>` sub-command must write or update `config.external.<type>` in `config.json` (without reinitialising the project). `<type>` must be one of the six supported type keys. `<path>` may be absolute or relative to the `.relic/` parent directory. This is the primary way to configure per-type directories post-init.
- **FR-10:** `relic external link <type>/<filename>` sub-command must validate that `config.external.<type>` is configured and the resolved file exists, then add the entry to `external_reads` in the active spec's `artifacts.json`. If the file does not exist or the type is not configured, the command must stop with a clear error.
- **FR-11:** `relic external init <remote-url> [--path <local-path>]` sub-command must add the given URL as a git submodule (via `git submodule add`) at the specified local path (default: `specs/`). It does not write to `config.external` — per-type paths are configured separately via `relic external set`. If the project is not a git repository, the command must fail with a clear error.
- **FR-12:** `relic external create <type> <title>` must: (1) verify `config.external.<type>` is configured; (2) assign the next sequential ID for that type by counting existing files matching `*-NNN-*.md` in the type directory; (3) write the document from the type's Markdown template; (4) perform a git commit in the spec repo with a standard commit message — Relic owns the commit, the team owns push and merge; (5) add the `<type>/<filename>` entry to `external_reads` in the active spec's `artifacts.json`.
- **FR-13:** Supported document types for `relic external create`: `fr` (Functional Requirement), `nfr` (Non-Functional Requirement), `br` (Business Requirement), `adr` (Architecture Decision Record), `us` (User Story), `epic`. Each type has a Markdown template stored in `templates/external/` and embedded at build time via `scripts/embed-templates.ts`.
- **FR-14:** Created filenames follow the pattern `<TYPE>-<NNN>-<slug>.md` (e.g. `FR-003-session-auth.md`, `ADR-012-database-sharding.md`) written into the type's configured directory. `NNN` is zero-padded to 3 digits. The sequential number is determined by counting existing files matching `<TYPE>-NNN-*.md` in the configured directory. `slug` is derived from the title: lowercase, spaces and punctuation replaced by hyphens, max 60 characters. The `external_reads` entry for this file is `"<type>/<TYPE>-<NNN>-<slug>.md"`.
- **FR-15:** `relic external list [--spec <id>]` must read every spec's `artifacts.json` and aggregate all `external_reads` entries into a unified list. Each entry includes: spec ID, type, filename, resolved path, and exists flag. If `--spec <id>` is provided, limit output to that spec. This command is entirely CLI-driven — it requires no LLM and must work with no active session.

### Non-Functional Requirements

- **NFR-1:** The `external.specsDir` path resolution must support both absolute paths and paths relative to the directory containing `.relic/`. Relative paths are resolved at runtime — they are not normalised or stored as absolute on write.
- **NFR-2:** Relic may **create and edit** files in any configured external type directory. It must never delete files. The expected workflow for any write is: work on a branch in the spec repo, commit via Relic (`relic external create` commits automatically; manual edits during AI workflow sessions must also be committed), and merge after owner review. The git branch+PR workflow is the safety guarantee — Relic does not enforce it, but the spec's design assumes it.
- **NFR-3:** If `external.specsDir` is set but the directory does not exist, no command may crash. Commands that depend on the external path must degrade gracefully with a clear warning in the output.
- **NFR-4:** `external_reads` entries must resolve to a file within the configured type directory. Any entry where the resolved path falls outside its type's configured directory (path traversal via `../`) must be rejected as a hard error. This check runs at `relic external link`, `relic external create`, and `relic validate`.
- **NFR-5:** The feature must work cross-platform (macOS, Linux, Windows) — path separator normalisation is required when storing and resolving `external_reads` entries.
- **NFR-6:** All new CLI commands follow Constitution Principle V: JSON by default, `--text` for human output.
- **NFR-7:** The external type directories are expected to live within a git repository (or git submodule). Relic does not require this — all read, create, and edit operations must work identically against a plain directory. The `relic external init` command is the only operation that explicitly requires git. The `relic external create` git commit step is skipped with a warning if the type directory is not inside a git repository.
- **NFR-8:** `relic external create` must check for a filename collision before writing. If `<TYPE>-<NNN>-<slug>.md` already exists in the type directory (possible with manual edits), increment `NNN` until a free slot is found.

---

## User Stories

- As a **platform engineer**, I want to point Relic at my company's spec repo so that every AI workflow command my team runs has access to the official FRs, NFRs, and ADRs without manual copy-paste.
- As a **developer**, I want to declare which external FRs and ADRs my spec depends on so that when I run `relic plan`, the AI incorporates those constraints without me having to manually open and paste them.
- As a **developer**, I want `relic context` to tell me whether my declared external dependencies exist on disk so that I can immediately diagnose a stale or missing external spec before an AI workflow command runs.
- As a **tech lead**, I want `relic validate` to warn me when a spec's `external_reads` references a file that no longer exists in the external repo, so I can keep spec dependencies up to date as business requirements evolve.
- As a **developer onboarding to a new project**, I want `relic external` to show me the top-level structure of the company spec repo so I know what documents are available to link.
- As a **PM or designer**, I want to read the team's requirements, ADRs, and user stories directly from the spec repository without needing access to or knowledge of the implementation repository, so I can stay aligned with the development team without a technical handoff.
- As a **developer**, I want to run `relic external create fr "Session expiry after inactivity"` to create a new Functional Requirement in the spec subrepo — pre-formatted, sequentially numbered, and automatically linked to my active spec — so I can capture requirements from my IDE without context-switching to a wiki or document editor.
- As a **tech lead**, I want the external spec repo to be a git submodule of the project monorepo so that every team member gets a consistent, version-pinned snapshot of the spec documents when they clone or pull — and advancing to the latest specs is a single `git submodule update --remote` operation.
- As a **developer**, I want Relic AI workflow commands (plan, clarify) to be able to edit external spec documents when contracts change during planning, so the spec repo stays current without a manual edit-commit cycle outside my IDE.
- As a **platform engineer**, I want each document type to have its own configured directory path so that my team's existing spec repo structure (which may not follow Relic conventions) is fully supported without migration.

---

## Scope

### In Scope

- `config.json` extension: `external` as a flat type→path map (`fr`, `nfr`, `br`, `adr`, `us`, `epic`)
- `relic init --external-<type> <path>` flags (per-type configuration at init time)
- `relic external` command: `init`, `set`, `link`, `create`, `list` sub-commands; per-type directory listing
- `relic context` extension: `external` map in JSON output (per-type configured paths)
- `artifacts.json` extension: `external_reads` array of `"<type>/<filename>"` strings
- `relic context --spec` extension: resolved `external_reads` per entry with `exists` and `resolved_path`
- `relic validate` extension: **hard errors** (not warnings) on missing `external_reads` files
- Prompt template updates (6 workflow commands): validate + read `external_reads` before main work; stop on broken paths
- Prompt templates: may edit external spec documents when contracts change during AI workflow sessions
- `project-config.ts` extension: `readExternalType`, `writeExternalType`, `getExternalTypes` helpers
- `relic external init <remote-url>` — add spec repo as a git submodule; per-type paths configured separately
- `relic external set <type> <path>` — configure or update a single type directory path
- `relic external create <type> <title>` — create + commit new spec documents; auto-link to active spec
- `relic external list [--spec <id>]` — aggregate all `external_reads` across all specs; CLI-only, no LLM
- Markdown document templates for 6 types: `templates/external/fr.md`, `nfr.md`, `br.md`, `adr.md`, `us.md`, `epic.md`
- Auto-incrementing sequential IDs per document type within each type's configured directory
- New domain artifact `ExternalSpecDomain.md`
- New contract artifact `ExternalConfigContract.md`

### Out of Scope

- Deleting files from the external spec repo
- Git push after document creation (Relic commits; the team owns push and merge)
- Git branch creation — branching is the team's workflow (Relic writes and commits on the current branch)
- Relic commands that run inside the external repo (no nested Relic sessions)
- Parsing or indexing external spec documents (no new `relic search` integration)
- Syncing `.relic/shared/` artifacts to the external spec repo
- Multiple external repos (one per project)
- Authentication or remote access to the external repo (local filesystem only)
- Automatic detection of non-Relic spec repo formats

---

## Shared Artifacts

**Owns:**
- `shared/domains/ExternalSpecDomain.md` — describes the external spec integration model, path resolution rules, graceful degradation behaviour, and the relationship between `external_reads` and the external repo
- `shared/contracts/ExternalConfigContract.md` — JSON shape for the `external` block in `config.json` and the `external_reads` extension in `artifacts.json`

**Reads:**
- `shared/domains/ProjectConfigDomain.md` (owned by 008) — `config.json` shape; this spec extends it with the `external` field
- `shared/contracts/ContextResultContract.md` (owned by 003) — `relic context` output shape; this spec adds the `external` field
- `shared/contracts/ScaffoldResultContract.md` (owned by 008) — `artifacts.json` shape; this spec extends it with `external_reads`

---

## Open Questions

- [x] **OQ-1:** `ContextResultContract.md` is owned by spec 003 — adding the `external` field is a cross-spec mutation. **Resolved →** changelog entries written at plan time and at implementation time (2026-07-02); the contract was amended additively with a provenance note.
- [x] **OQ-2:** Should `relic external link` validate path existence at link time or defer to `relic validate`? **Resolved → both.** Validate immediately at `relic external link` (hard error if missing). Also validate at `relic validate` (hard error, not warning).
- [x] **OQ-3:** Should `external.specsDir` be per-project-member (gitignored) or team-shared (committed)? **Resolved → committed** (D-2). Per-type paths in `config.external` are team-wide conventions.
- [x] **OQ-4:** What happens when type paths change and `external_reads` entries break? **Resolved → hard stop.** Any command that uses `external_reads` validates all paths before doing any work. A broken path stops the command immediately with a clear error listing which entries are missing. Broken paths do not produce degraded or partial output — they must be fixed first.
- [x] **OQ-5:** Should `relic external list` show all `external_reads` across all specs or only the active one? **Resolved → all specs by default**, with `--spec <id>` to filter. The config file is the source of truth — no LLM needed. `relic external list` is a pure CLI inspection tool.
- [x] **OQ-6:** Should `relic external create` display a reminder about committing to the spec repo? **Resolved → no reminder.** Relic commits the new file to the spec repo automatically (internal to the spec repo's git history). The push to remote and the monorepo submodule update are the team's workflow — no reminder needed.
- [x] **OQ-7:** Should `relic external init --create` bootstrap a new spec repo? **Resolved → not this.** Instead, `config.external` is a fine-grained per-type path map (`fr`, `nfr`, `br`, `adr`, `us`, `epic`), so any existing repo structure is supported. Teams configure each type's directory to match their existing layout. `relic external init` only handles the git submodule wiring.

---

## Decisions

- **D-1:** Relic may create and edit files in external type directories. It must never delete files. The git branch+PR workflow is the safety model: Relic operates on the current branch and commits; the document owner reviews and merges. This model allows contracts to evolve during scope and planning phases without losing the audit trail.
- **D-2:** `config.external` (per-type paths) is committed — not gitignored. All team members share the same type directory configuration. It is a team convention.
- **D-3:** `external_reads` entries must resolve within their type's configured directory. Path traversal (`../`) is rejected as a hard error at `relic external link`, `relic external create`, and `relic validate`.
- **D-4:** The external spec repo is the team-wide human-readable knowledge layer. PMs and designers browse it directly without using Relic or accessing the code repo. The directory layout is completely user-controlled via `config.external` — Relic imposes no structure.
- **D-5:** The canonical deployment model is git submodule. `relic external create` commits to the spec repo after writing; push to remote and monorepo submodule update are the team's workflow.
- **D-6:** `config.external` is a flat per-type map, not a single `specsDir`. This accommodates teams whose spec repos have existing layouts (e.g. `docs/decisions/` for ADRs, `requirements/functional/` for FRs) without requiring migration or Relic-specific directory conventions.
