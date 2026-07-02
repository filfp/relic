# Tasks: External Spec Integration

**Spec ID:** 009-external-spec-integration
**Generated from plan:** 2026-07-02

---

## Tasks

### Phase 1 — Utility layer (config + resolution)

- [x] **T-1** `project-config.ts`: `ExternalConfig` type, `EXTERNAL_TYPES`, optional `external` field on `ProjectConfig`, preserved through read/write round-trips
- [x] **T-2** `project-config.ts`: `readExternalTypes` / `writeExternalType` / `resolveExternalDir` helpers (relative paths resolve against the `.relic/` parent at runtime; stored as given)
- [x] **T-3** `project-config.ts`: `parseExternalEntry` + `resolveExternalRead` — `"<type>/<filename>"` parsing, existence check, unconfigured-type and path-traversal hard errors (D-3), separator normalisation (NFR-5)
- [x] **T-4** Re-export the external helpers from `packages/utility/src/index.ts`
- [x] **T-5** Unit tests: round-trip, relative/absolute resolution, traversal rejection, unconfigured type, backslash normalisation

### Phase 2 — `relic external` command

- [x] **T-6** Create `templates/external/` document templates: `fr.md`, `nfr.md`, `br.md`, `adr.md`, `us.md`, `epic.md` (with `{{ID}}`, `{{TITLE}}`, `{{DATE}}` placeholders)
- [x] **T-7** `external.ts`: report sub-command (no args) — per-type path, exists, one-level listing; `{"configured": false}` when empty (FR-3)
- [x] **T-8** `external.ts`: `set <type> <path>` — validate type key, write `config.external.<type>`, report previous/new/exists (FR-9)
- [x] **T-9** `external.ts`: `link <type>/<filename>` — validate configured + exists + no traversal, append to active spec's `external_reads` (dedup), report (FR-10)
- [x] **T-10** `external.ts`: `create <type> <title>` — next sequential ID by max+1 with collision guard (FR-14/NFR-8), write from template, git commit when in a repo else `committed:false` + warning (NFR-7), auto-link to active spec (FR-12)
- [x] **T-11** `external.ts`: `list [--spec <id>]` — aggregate `external_reads` across all specs, no session required (FR-15)
- [x] **T-12** `external.ts`: `init <remote-url> [--path]` — `git submodule add`; fails clearly outside a git repo; never writes `config.external` (FR-11)
- [x] **T-13** Register `external` in `bin.ts` + `bin.debug.ts`; export `runExternal` from core `index.ts`
- [x] **T-14** Tests `external.test.ts`: set/link/list happy paths + hard errors; create inside temp git repo (`committed:true`, sha) and outside (`committed:false` + warning); collision increments NNN

### Phase 3 — context / validate / init extensions

- [x] **T-15** `context.ts`: `external` field per contract §3 (`{configured:false}` when absent) + `--text` rendering
- [x] **T-16** `context.ts`: resolved `external_reads` entries with `exists`/`resolved_path` when present in the spec's `artifacts.json`
- [x] **T-17** `validate.ts`: `external_errors` — missing file, unconfigured type, traversal → `valid:false` (FR-7)
- [x] **T-18** `init.ts` + bin flags: `--external-fr` … `--external-epic` write `config.external` at init (FR-2)
- [x] **T-19** Tests for context/validate/init extensions

### Phase 4 — Prompt snippet

- [x] **T-20** `templates/snippets/external-reads.md`: validate-then-read step (hard stop on `exists:false` per OQ-4; read every linked doc before main work; edit-never-delete + commit expectation per NFR-2/D-1)
- [x] **T-21** Add `<!-- include: relic snippet external-reads -->` to `specify`, `clarify`, `plan`, `tasks`, `implement`, `fix` prompts; rebuild embeds; verify `relic snippet external-reads` resolves

### Phase 5 — Knowledge layer + docs

- [x] **T-22** Amend `ContextResultContract.md` (003-owned, cross-spec per OQ-1) with the additive `external` / `external_reads` fields + provenance note
- [x] **T-23** Changelog entry for the contract amendment via `relic write --changelog`
- [x] **T-24** Full test suite + typecheck green; `relic validate` clean; update 009 HTML content regions

---

## Notes

- `scripts/embed-templates.ts` requires **no change** — it already embeds `templates/external/*.md` (recursive walk).
- Ordering: Phase 1 blocks everything; Phases 2 and 3 are independent of each other; Phase 4 depends on Phase 3 (`relic context` must expose `external_reads` before the snippet can instruct reading it).
- Overlap: `bin.ts` and the six prompts are shared surface with spec 010 (snippet includes) — additive lines only.
