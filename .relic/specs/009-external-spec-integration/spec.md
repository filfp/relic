# Spec: External Spec Integration

**Spec ID:** 009-external-spec-integration
**Created:** 2026-05-20
**Status:** draft

---

## Overview

Enterprise teams maintain a canonical spec repository separate from their implementation repositories — typically containing Functional Requirements (FR), Non-Functional Requirements (NFR), User Stories, and Architecture Decision Records (ADRs) owned by the business or a platform team. Today Relic has no way to know this repo exists, so AI workflow commands operate without that context: a plan is written without the FR that constrains it, a spec is scoped without the ADR that governs the architecture, and a fix is diagnosed without the business rule that was violated. This spec introduces **External Spec Integration** — a mechanism for Relic to know where the external spec folder lives (via `config.json`), surface it to AI agents via `relic context`, allow individual specs to declare which external documents they depend on, and load those documents automatically during every relevant workflow command.

---

## Requirements

### Functional Requirements

- **FR-1:** `config.json` must support an optional `external` block with at minimum a `specsDir` field containing a path (absolute or relative to the project root) pointing to the external spec repository.
- **FR-2:** `relic init` must accept an optional `--external-specs <path>` flag that writes the `external.specsDir` value into `config.json` during project initialisation.
- **FR-3:** A new `relic external [--text]` command must resolve `external.specsDir`, verify the path exists, list the top-level structure (directories and files, one level deep), and report the result as JSON (default) or human-readable text (`--text`). If `external.specsDir` is not set, the command reports `{ "configured": false }`.
- **FR-4:** `relic context` JSON output must include an `external` field: `{ "configured": boolean, "path": string | null, "exists": boolean }`.
- **FR-5:** `artifacts.json` must support an optional `external_reads` array — a list of paths relative to `external.specsDir` pointing to specific external documents this spec depends on (e.g. `"FR/FR-001-auth.md"`, `"ADR/ADR-012-session-store.md"`).
- **FR-6:** `relic context --spec <id>` must include the resolved `external_reads` paths in its output, with an `exists` field per entry.
- **FR-7:** `relic validate` must check that every path in `external_reads` resolves to an existing file when `external.specsDir` is configured. Missing files are reported as warnings (not errors), since the external repo may be at a different checkout state.
- **FR-8:** AI workflow prompt templates (`specify.md`, `clarify.md`, `plan.md`, `tasks.md`, `implement.md`, `fix.md`) must include a step that reads each `external_reads` file before performing their main work. The LLM reads these files to incorporate their constraints, decisions, and language into the output.
- **FR-9:** `relic external set <path>` sub-command must write or update `external.specsDir` in `config.json` (without reinitialising the project).
- **FR-10:** `relic external link <relative-path>` sub-command must add the given relative path to `external_reads` in the active spec's `artifacts.json`.

### Non-Functional Requirements

- **NFR-1:** The `external.specsDir` path resolution must support both absolute paths and paths relative to the directory containing `.relic/`. Relative paths are resolved at runtime — they are not normalised or stored as absolute on write.
- **NFR-2:** All external path reads are read-only. Relic must never write to, delete, or modify files in `external.specsDir`.
- **NFR-3:** If `external.specsDir` is set but the directory does not exist, no command may crash. Commands that depend on the external path must degrade gracefully with a clear warning in the output.
- **NFR-4:** `external_reads` paths that resolve outside `external.specsDir` (path traversal via `../`) must be rejected with a clear error.
- **NFR-5:** The feature must work cross-platform (macOS, Linux, Windows) — path separator normalisation is required when storing and resolving `external_reads` entries.
- **NFR-6:** All new CLI commands follow Constitution Principle V: JSON by default, `--text` for human output.

---

## User Stories

- As a **platform engineer**, I want to point Relic at my company's spec repo so that every AI workflow command my team runs has access to the official FRs, NFRs, and ADRs without manual copy-paste.
- As a **developer**, I want to declare which external FRs and ADRs my spec depends on so that when I run `relic plan`, the AI incorporates those constraints without me having to manually open and paste them.
- As a **developer**, I want `relic context` to tell me whether my declared external dependencies exist on disk so that I can immediately diagnose a stale or missing external spec before an AI workflow command runs.
- As a **tech lead**, I want `relic validate` to warn me when a spec's `external_reads` references a file that no longer exists in the external repo, so I can keep spec dependencies up to date as business requirements evolve.
- As a **developer onboarding to a new project**, I want `relic external` to show me the top-level structure of the company spec repo so I know what documents are available to link.

---

## Scope

### In Scope

- `config.json` extension with optional `external.specsDir` field
- `relic init --external-specs <path>` flag
- `relic external` command: get/set/link sub-commands; report path + structure
- `relic context` extension: `external` field in JSON output and `--text` output
- `artifacts.json` extension: `external_reads` array
- `relic context --spec` extension: resolved `external_reads` per entry with existence check
- `relic validate` extension: warn on missing `external_reads` files
- Prompt template updates (6 workflow commands): read `external_reads` files before main work
- `project-config.ts` extension: `readExternalSpecsDir`, `writeExternalSpecsDir` helpers
- New domain artifact `ExternalSpecDomain.md` describing the integration model
- New contract artifact `ExternalConfigContract.md` describing the JSON shape extensions

### Out of Scope

- Writing, editing, or syncing files in the external spec repo
- Relic commands that run inside the external repo (no nested Relic sessions)
- Parsing or indexing external spec documents (no new `relic search` integration)
- Version control or change tracking on the external repo
- Multiple external repos (only one `external.specsDir` per project)
- Authentication or remote access to the external repo (local filesystem only)
- Automatic detection of FR/ADR document formats

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

- [ ] **OQ-1:** `ContextResultContract.md` is owned by spec 003 — adding the `external` field is a cross-spec mutation. A changelog entry is required at plan time.
- [ ] **OQ-2:** `relic external link` adds to the active spec's `artifacts.json`. Should it also validate that the path exists at link time, or defer to `relic validate`? Current preference: validate immediately and fail with an actionable error.
- [ ] **OQ-3:** Should `external.specsDir` be per-project-member (gitignored, like `session.json`) or team-shared (committed, like `engines`)? Hypothesis: committed — the external spec repo location is a team convention, not a personal preference.
- [ ] **OQ-4:** `external_reads` paths are relative to `external.specsDir`. What happens when `external.specsDir` changes? Should `relic external set <new-path>` warn about which `external_reads` entries would break?
- [ ] **OQ-5:** Should `relic external list` (no arguments) show all `external_reads` across all specs, not just the active one?

---

## Decisions

- **D-1:** External spec paths are always read-only. Relic never modifies the external repo.
- **D-2:** `external.specsDir` is committed (not gitignored) — it is a team convention.
- **D-3:** `external_reads` path traversal outside `external.specsDir` is rejected at `relic external link` time.
