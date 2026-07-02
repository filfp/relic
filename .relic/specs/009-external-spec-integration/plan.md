# Plan: External Spec Integration

**Spec ID:** 009-external-spec-integration
**Status:** ready
**Planned:** 2026-07-02 (against the post-overhaul spec: per-type path map, submodule model)

---

## Architecture Overview

The feature is layered bottom-up, mirroring the existing package boundaries:

1. **Utility layer (`@relic/utility`, `project-config.ts`)** — `ProjectConfig` gains an
   optional `external` map (`fr | nfr | br | adr | us | epic` → path). All path logic
   lives here: config accessors, runtime resolution (absolute or relative to the
   `.relic/` parent — never normalised on write, per NFR-1), `"<type>/<filename>"`
   entry parsing, and the path-traversal guard (D-3: resolved path must stay inside
   the type's configured directory).

2. **Command layer (`@relic/core`)** — one new command module `external.ts`
   implementing the `relic external` sub-commands (report, `init`, `set`, `link`,
   `create`, `list`) exactly per `ExternalConfigContract.md` §4. Three existing
   commands are extended: `context.ts` (§3 shapes: `external` map + resolved
   `external_reads`), `validate.ts` (§5: `external_errors`, hard errors), and
   `init.ts` (`--external-<type>` flags).

3. **Templates** — six document templates in `templates/external/` with
   `{{ID}}/{{TITLE}}/{{DATE}}` placeholders. `scripts/embed-templates.ts` already
   walks `templates/` recursively (only `prompts/` is excluded), so the new files are
   embedded with keys `external/<type>.md` — **no build-script change needed**
   (removes `scripts/embed-templates.ts` from the original touches_files estimate).

4. **Prompt layer** — per the 010 snippet architecture, FR-8 is implemented as ONE new
   snippet `templates/snippets/external-reads.md` included by the six workflow prompts
   (`specify`, `clarify`, `plan`, `tasks`, `implement`, `fix`), not per-prompt prose.
   The snippet instructs: read `external_reads` from `relic context --spec` output;
   if any entry has `exists: false`, STOP and report (OQ-4 hard-stop); otherwise read
   every file before the main work; documents may be edited (never deleted) when
   contracts change, with a commit expected in the spec repo (NFR-2).

Git operations (`external init` submodule add, `external create` commit) use
`spawnSync` against the system git. `create` commits only the created file
(`git add <file> && git commit`) inside the type directory's repo; when the directory
is not in a git repo, `committed: false` + warning (NFR-7).

## Sequential ID assignment (`external create`)

`nextExternalId(dir, TYPE)`: scan the configured directory for files matching
`^<TYPE>-(\d+)-`, take max+1 (not count — robust against gaps), zero-pad to 3.
Collision guard (NFR-8): while `<TYPE>-<NNN>-<slug>.md` exists, increment NNN.
Slug: lowercase, non-alphanumeric → hyphens, collapse repeats, trim, max 60 chars
(reuses `slugify` from `@relic/utility`, extended with a length cap parameter if needed).

---

## Implementation Steps

### Phase 1 — Utility layer (config + resolution)

1. `project-config.ts`: add `ExternalConfig` type, `EXTERNAL_TYPES` const, `external`
   field on `ProjectConfig` (preserved through read/write round-trips).
2. Helpers: `readExternalTypes`, `writeExternalType`, `resolveExternalDir`,
   `parseExternalEntry`, `resolveExternalRead` (returns entry/type/filename/
   resolved_path/exists; throws typed errors for unconfigured type and traversal).
3. Re-export from `packages/utility/src/index.ts`; unit tests in
   `__tests__/project-config.test.ts` (round-trip, relative/absolute resolution,
   traversal rejection, unconfigured type, Windows separator normalisation).

### Phase 2 — `relic external` command

1. `templates/external/{fr,nfr,br,adr,us,epic}.md` document templates.
2. `packages/core/src/commands/external.ts`: report / `set` / `link` / `create` /
   `list` / `init` per contract §4 (JSON default, `--text` per NFR-6).
3. Register in `bin.ts` and `bin.debug.ts`; export from core `index.ts`.
4. Tests `__tests__/external.test.ts`: set/link/create/list against a temp project;
   create inside a temp git repo asserts `committed: true` + valid `commit_sha`;
   create outside git asserts `committed: false` + warning; collision increments NNN;
   traversal and unconfigured-type hard errors.

### Phase 3 — Extend context / validate / init

1. `context.ts`: `external` field (§3) always present (`{configured:false}` when
   empty); `external_reads` resolved entries when the spec's `artifacts.json` has
   them; `--text` output extended.
2. `validate.ts`: `external_errors` (§5) — missing files, unconfigured types, and
   traversal entries all fail validation (`valid: false`).
3. `init.ts` + bin flag plumbing: `--external-fr <path>` … `--external-epic <path>`.
4. Tests for all three extensions.

### Phase 4 — Prompt snippet

1. `templates/snippets/external-reads.md` (validate-then-read, hard stop, edit-not-
   delete rules).
2. Add `<!-- include: relic snippet external-reads -->` to the six workflow prompts
   right after spec context loading.
3. Rebuild embeds; verify `relic snippet external-reads` resolves.

### Phase 5 — Knowledge layer + docs

1. Amend `ContextResultContract.md` (owned by 003 — cross-spec mutation, see
   Intersection Notes) with the `external` / `external_reads` fields.
2. Changelog entries via `relic write --changelog` (plan creation per OQ-1; the
   contract amendment at implementation time).
3. Update 009 HTML (content regions) per the html-mode step.

---

## File Changes

| File | Action | Notes |
|------|--------|-------|
| `packages/utility/src/project-config.ts` | modify | `external` map, accessors, resolution, traversal guard |
| `packages/utility/src/index.ts` | modify | re-exports |
| `packages/utility/src/__tests__/project-config.test.ts` | modify | external config/resolution tests |
| `packages/core/src/commands/external.ts` | create | report/init/set/link/create/list |
| `packages/core/src/commands/context.ts` | modify | `external` + `external_reads` fields |
| `packages/core/src/commands/validate.ts` | modify | `external_errors` hard errors |
| `packages/core/src/commands/init.ts` | modify | accept external type map |
| `packages/core/src/index.ts` | modify | export `runExternal` |
| `packages/core/src/__tests__/external.test.ts` | create | full sub-command coverage |
| `packages/cli-node/src/bin.ts` | modify | `external` command + init flags |
| `packages/cli-node/src/bin.debug.ts` | modify | same |
| `templates/external/fr.md` … `epic.md` | create | 6 document templates |
| `templates/snippets/external-reads.md` | create | FR-8 workflow step (single source) |
| `templates/prompts/{specify,clarify,plan,tasks,implement,fix}.md` | modify | one include line each |
| `scripts/embed-templates.ts` | none | already recursive — no change required |

---

## Shared Artifact Changes

| Artifact | Action | Approved by |
|----------|--------|-------------|
| `shared/contracts/ExternalConfigContract.md` | none (already authored) | 009 owns |
| `shared/domains/ExternalSpecDomain.md` | none (already authored) | 009 owns |
| `shared/contracts/ContextResultContract.md` | update — add `external` + `external_reads` fields | cross-spec (003 owns) — changelog required, see OQ-1 |

---

## Intersection Notes

- **`ContextResultContract.md` (owned by 003-fix-solve-workflow):** this plan adds the
  `external` and `external_reads` fields to `relic context` output. Additive only —
  no existing field changes shape, so 003's fix/solve flows are unaffected. Recorded
  in the changelog at plan time (OQ-1) and amended in the contract at implementation
  time with a provenance note.
- **`validate.ts`:** touched by 001 (tests), 005 (toon), and the 008 html allowlist
  fix. The change here is additive (a new `external_errors` array and its effect on
  `valid`) and does not alter existing checks.
- **`bin.ts` / prompts:** shared surface with 010 (snippet include lines). Additive
  include lines only; no existing directive is moved or removed.

---

## Changelog Reference

- Plan-time entry: "009: plan written — external integration per-type contract"
  (includes the OQ-1 cross-spec notice for ContextResultContract).
- Implementation-time entry expected for the ContextResultContract amendment.
