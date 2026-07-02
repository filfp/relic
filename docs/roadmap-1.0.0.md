# Relic 1.0.0 Roadmap

> Written 2026-07-02 from a full audit of the codebase at v0.8.19.
> **Revised 2026-07-02** after reconciling with main (`78a160a`), which landed work from a
> second machine: spec 010 (prompt snippet injection, fully implemented), spec 011
> (skill extraction, scaffolded), a spec 009 overhaul, and the html-mode validate fix.
> Goal: close all open work, modernise the AI-engine integrations, and ship a stable,
> documented 1.0.0.

---

## Where the project stands (post-reconciliation)

- **Version:** 0.8.19, published on npm and PyPI. CI publishes on `v*` tags; a test
  workflow runs `bun run test` on PRs.
- **Specs 001–008:** fully implemented.
- **Spec 010 (prompt snippet injection): DONE** (27/27). Prompts now carry
  `<!-- include: relic snippet <name> -->` directives resolved at LLM runtime via
  `relic snippet <name>`; shared prompt fragments live once in `templates/snippets/`.
- **Spec 009 (external spec integration): OPEN** — spec/plan overhauled on main
  (per-type path map `{ fr, nfr, br, adr, us, epic }`, git-submodule integration model,
  `ExternalConfigContract` + `ExternalSpecDomain` written, hard validate errors,
  `relic external list`), but `tasks.md` is still a placeholder and nothing is implemented.
- **Spec 011 (skill extraction): OPEN** — spec/plan written, tasks not generated.
  Supersedes the old "modernise Claude engine" phase of this roadmap.
- **Phase 1 (this branch):** base.html chrome fixes + `relic html-sync` — done,
  reconciled onto new main (spec HTMLs for 009/010/011 re-based, escaping fix from the
  instance-level hotfix folded into the template, prompt-level HTML rules moved into
  `templates/snippets/html-mode.md`).
- **Tests:** all green per-package (138 core / 67 utility / 11 engines). Plain root
  `bun test` still shows engine-test pollution; 16 pre-existing typecheck errors in
  toon/search test files.
- **Docs:** `CLAUDE.md` and `docs/*` significantly stale (session.json vs current-spec,
  12 prompts vs 10, no mention of snippets/skills/mode/write/upgrade/html-sync).

---

## Phase 1 — HTML mode bug fixes + `relic html-sync` ✅ (this branch)

Landed as the first commit of `roadmap/v1.0.0`:

- **Custom-element parse-timing fix** — `connectedCallback` fires mid-parse before
  children exist; content-reading components (`relic-flow`, `relic-callout`,
  `relic-chip`, `relic-status`) rendered from empty sources, so flows produced a 0×0
  SVG and dumped raw mermaid text into the page. All components now defer rendering to
  `DOMContentLoaded` via `defineRelic`, with a `data-relic-rendered` guard.
- **`</script` escaping convention** for the embedded reader source blocks (a literal
  occurrence truncated the block and parsed the rest of the file as live HTML).
- **Theme-aware components** via `--tone-*` CSS variables (light + dark values).
- **Reader hardening** — separate panel instead of `innerHTML` save/restore, GFM task
  checkboxes, styled fallback message.
- **`relic html-sync`** — generated HTML split into machine-managed chrome and
  sentinel-marked content regions; the sync re-bases existing files onto the current
  template (legacy files handled heuristically) and deterministically embeds
  spec/plan/tasks markdown into the reader source blocks. Runs automatically in
  `relic scaffold`, `relic mode html`, and `relic upgrade`.
- **Docs-template escape fix** folded in from main's instance-level hotfix: raw
  `<script …>` text inside `<template id="relic-docs">` swallowed everything up to the
  next real `</script>` (blank page); now written as `&lt;script …&gt;` in the template
  itself so newly scaffolded files are correct.
- Contracts amended (`HtmlComponentContract`, `ScaffoldResultContract`); changelog
  entry written via `relic write`; all four existing spec HTMLs re-based.

---

## Phase 2 — Finish the 4-vs-5 file invariant ✅ (this branch)

Main landed the code half (fix `2026-06-02-validate-illegal-files-html-mode`): `relic
validate` permits `<spec-id>.html` in html mode. This branch completed the text half:

- `templates/preamble.md` rewritten mode-conditionally: 4 files always, plus the
  CLI-created `<spec-id>.html` when `config.json` `mode = "html"` (tree diagram,
  What-Belongs-Where, The Test, and Prohibited Actions all updated).
- `.relic/preamble.md` instance refreshed; `SpecFilesAllowlistRule.md` restated with the
  html-mode exception (and its manifest tldr corrected — it referenced a `history.json`
  that exists nowhere in the code).
- Deferred to Phase 5 as polish: `relic validate` warning when a spec HTML exists while
  mode is `"md"`.

---

## Phase 3 — Implement spec 009: External Spec Integration

Spec and plan are current on main (post-overhaul); tasks were never generated.

1. `/relic.tasks` against the updated plan.
2. Implement per the revised contract: `config.external` as a flat per-type path map
   (`{ fr, nfr, br, adr, us, epic }`), `external_reads` as `<type>/<filename>` entries,
   `relic external` (report / set / link / list / create with `committed`/`commit_sha`),
   `external` field in `relic context`, hard validate errors for missing external files,
   path-traversal rejection, git-submodule awareness per `ExternalSpecDomain`.
3. Prompt updates via the snippet system (a new snippet, not per-prompt edits).
4. Resolve the remaining open questions in the spec at plan time.

---

## Phase 4 — Implement spec 011: Skill Extraction

Replaces the old "modernise AI-engine integrations" phase — main scoped this properly
as a spec. Key decisions already recorded there:

- Skills live in `.claude/skills/<name>/SKILL.md` directories (current Claude Code best
  practice), supporting multi-file bundles (scripts/helpers alongside SKILL.md).
- `embed-engine-templates.ts` walks `templates/skills/` recursively into a `SKILLS`
  export; written by both `relic init` and `relic add-engine`, routed through the
  claude engine writer.
- Proactive auto-invocation via the `description` frontmatter field.
- `<!-- use: relic.<skill> -->` directive replaces prose skill references in prompts.
- Ownership boundary: relic writes only relic-owned files in `.claude/` — never
  user-maintained files (`CLAUDE.md`, `agents.md`).

Steps: `/relic.tasks` → implement → verify skills load in Claude Code. Fold in the old
phase-4 secondary items: verify Codex (`.codex/commands/` + `config.toml`) and Copilot
(`.github/prompts/*.prompt.md`) layouts against current docs.

---

## Phase 5 — Hardening, docs, release hygiene

- **Test pollution:** root `bun test` fails engine tests that pass in isolation
  (shared tmp/cwd leakage). Make both `bun test` and `bun run test` green.
- **Typecheck:** fix the 16 pre-existing errors (search/toon-migrate/toon test files +
  `toon-migrate.ts`); add `tsc --noEmit` to CI.
- **Docs refresh:** rewrite `CLAUDE.md` to match reality (session.json, 12 prompts,
  snippet/skill architecture, `write`/`mode`/`upgrade`/`html-sync`/`snippet`/`external`
  commands, toon manifests, fix/solve pipeline); refresh `README.md` and `docs/*`.
- **Open questions:** resolve or explicitly defer the CLAUDE.md "Open Questions" list.
- **Upgrade path:** confirm `relic upgrade` on an old project refreshes preamble,
  base.html, spec HTML chrome, prompts, snippets, and (post-011) skills.

---

## Phase 6 — Ship 1.0.0

1. All phases merged; `bun test`, `bun run test`, `tsc --noEmit` green.
2. Manual smoke: `relic init` (md + html modes) in a throwaway project; full forward
   lifecycle + one fix/solve cycle in Claude Code; open generated HTML in a browser
   (light + dark, file:// and HTTP) with at least one flow diagram.
3. `bun run publish` → v1.0.0 tag → npm + PyPI.
4. Post-1.0 backlog: Homebrew tap, plugin packaging, full command-to-skill migration
   (flagged out of scope by 011), multiple external repos, flow-renderer layout
   improvements.

---

## Suggested order of execution

| # | Work | Size | Ships as |
|---|---|---|---|
| 1 | Phase 1 (base.html + html-sync) ✅ + Phase 2 (preamble allowlist) | S remaining | 0.9.0 |
| 2 | Phase 3 (spec 009) | M | 0.9.x |
| 3 | Phase 4 (spec 011 skills) | M | 0.10.0 |
| 4 | Phase 5 (hardening + docs) | S | 0.10.x |
| 5 | Phase 6 (release) | S | **1.0.0** |
