# Relic 1.0.0 Roadmap

> Written 2026-07-02 from a full audit of the codebase at v0.8.19.
> Goal: close all open work, fix the HTML-mode defects, modernise the AI-engine
> integrations, and ship a stable, documented 1.0.0.

---

## Where the project stands (audit summary)

- **Version:** 0.8.19, published on npm and PyPI. CI publishes on `v*` tags; a test
  workflow runs `bun run test` on PRs.
- **Specs:** 8 of 9 specs are fully implemented (001–008). **009-external-spec-integration
  is the only open feature** — spec.md and plan.md are complete, but `tasks.md` is a
  placeholder ("Task 1 / Task 2") and nothing is implemented.
- **Tests:** 197 tests, all green when run per-package. Running plain `bun test` at the
  repo root produces 8 engine-test failures from cross-test pollution (they pass in
  isolation) — a hygiene issue, not a product bug.
- **Docs:** `CLAUDE.md` and parts of `docs/` are significantly stale (they describe
  `.relic/current-spec` — the code uses `session.json`; they list 10 prompts — there are
  12; `relic deep-search` no longer exists as its own command; `mode.ts`, `write.ts`,
  `upgrade.ts`, `ask.ts` are missing from the described layout).
- **HTML mode:** functional but carries the defects detailed in Phase 1 below.

---

## Phase 1 — HTML mode bug fixes (P0, ship as 0.9.x)

These are the user-visible breakages. All fixes land in `templates/base.html` plus a
small amount of CLI code; every fix must also reach *already generated* HTML files
(see 1.4).

### 1.1 `<relic-flow>` breaks the whole page — custom-element parse timing

**Root cause:** all components that read their own content (`relic-flow`,
`relic-callout`, `relic-chip`, `relic-status`) do so in `connectedCallback`. When the
browser's streaming parser creates the element, `connectedCallback` fires **before the
element's children are parsed**, so `this.textContent` is empty. For `relic-flow` this
means `renderFlow('')` produces an SVG with `viewBox="0 0 0 0"` at `width:100%`
(degenerate layout), and the raw mermaid text is then appended by the parser *after*
the empty SVG — raw `graph TD A[Start] --> B...` text spills into the page and the
layout collapses. Attribute-driven components (`relic-chart`, `relic-table`) are
unaffected, which is why only flows appear to break.

**Fix:** in every content-reading component, defer rendering when the document is still
parsing:

```js
connectedCallback() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => this.render(), { once: true });
  } else {
    this.render();
  }
}
```

Additionally: `renderFlow` must guard empty/unparseable input (render nothing rather
than a 0×0 SVG), and the flow SVG should get a minimum sensible viewBox.

### 1.2 Embedded markdown can terminate the page (`</script>` hazard)

The inline-reader source blocks are `<script type="text/plain">`. If `spec.md` /
`plan.md` / `tasks.md` contain a literal `</script>` (very likely in specs that discuss
HTML — including Relic's own spec 008), the block terminates early and the rest of the
markdown is parsed as live HTML — a second "breaks all HTML" vector.

**Fix:** define an escaping convention: the writer (LLM prompt instruction + docs in
`#relic-docs`) must write `<\/script` inside the blocks, and the reader JS unescapes it
before parsing. Update all 6 prompt HTML steps to state this rule.

### 1.3 Nav links open raw markdown instead of the styled reader

The current `templates/base.html` already contains the inline markdown reader
(header nav → styled reader panel → back button). The problem is **distribution**:
every generated `<spec-id>.html` / fix HTML is a frozen full copy of whatever
`base.html` existed at scaffold time. Files generated before the reader existed
(e.g. `008-html-spec-mode.html`, `009-…html`, the two `.relic/fixes/*.html`) never
receive it, so their nav links still navigate to the raw `.md` file.

**Fix (structural, not prompt-based):** add a deterministic re-base step to the CLI —
`relic html-sync` (or fold it into `relic scaffold` + `relic upgrade`):

- Replace everything that is "chrome" (the `<head>`, both `<script>` blocks, the
  `<template id="relic-docs">`, the header) with the current `base.html` version.
- Preserve the authored parts: `#relic-body` sections and the three `relic-src-*`
  source blocks.
- Requires marking chrome vs. content regions in `base.html` with stable comment
  sentinels (e.g. `<!-- relic:chrome:start -->` … `<!-- relic:chrome:end -->`) so the
  swap is a deterministic string operation, not an LLM task.
- `relic scaffold` in html mode runs the sync automatically when the spec HTML already
  exists; the prompts' HTML step then only edits content sections.

This is the single most important structural fix: 800 lines of infrastructure JS must
never be LLM-maintained per file.

### 1.4 Smaller base.html defects (fix in the same pass)

- `.reader-msg` fallback panel is styled under `#relic-reader .reader-msg` but rendered
  *outside* `#relic-reader` → unstyled fallback. Fix the selector or the markup.
- Dark-mode gaps: components inject hardcoded light-theme hex values (chart axis text
  `#64748b`, callout body colour `#1e293b`, progress track `#e2e8f0`, flow node fills).
  Move to `var(--*)` custom properties so dark mode is consistent.
- Reader parser gaps: task-list items (`- [x]` / `- [ ]`) render as literal text —
  `tasks.md` is entirely checkboxes, so render them as disabled checkboxes; no nested
  list support; headings inside blockquotes.
- `edgeRe` in `renderFlow` is computed but only used as a gate — simplify while there.

### 1.5 Verification

Add a lightweight rendered-DOM test (happy-dom or a headless Chrome smoke test) that
loads a generated spec HTML containing a `<relic-flow>`, asserts the SVG has nodes and
no raw mermaid text leaks, and asserts the reader opens from an embedded source block.

---

## Phase 2 — The 4-files-per-spec invariant is now conditional (P0)

HTML mode legitimately adds a 5th file (`<spec-id>.html`) to the spec folder, but the
invariant is hardcoded in several places:

| Location | Problem |
|---|---|
| `templates/preamble.md` (lines ~20, 60, 66, Prohibited Actions) | "Exactly four files. No others." / "If you are about to create a fifth file… stop." |
| `packages/core/src/commands/validate.ts:12` | `ALLOWED_SPEC_FILES` = the 4 md/json files → **`relic validate` flags the spec's own HTML file as a violation in html mode** |
| `.relic/preamble.md` (this repo's own copy) | same stale text |
| `.relic/shared/rules/SpecFilesAllowlistRule.md` | must be re-stated as mode-conditional |

**Fix:** state the allowlist as mode-conditional: 4 files always; plus `<spec-id>.html`
when `config.json` `mode` is `"html"`. Update `validate.ts` to read the mode and extend
the set accordingly (and to *warn* if a spec HTML exists while mode is `"md"`).
`relic upgrade` must refresh `preamble.md` in user projects. Add a validate test for
both modes.

---

## Phase 3 — Finish spec 009: External Spec Integration (P1)

The only open feature. spec.md (FR-1…FR-10, NFR-1…6, decisions D-1…D-3) and plan.md
exist; tasks were never generated.

1. Regenerate `tasks.md` from the existing plan (`/relic.tasks`).
2. Implement: `config.json` `external.specsDir` block; `relic init --external-specs`;
   `relic external` (report / `set` / `link`); `external` field in `relic context`;
   `external_reads` in `artifacts.json` with per-entry existence in
   `relic context --spec`; `relic validate` warnings for missing external files;
   path-traversal rejection (NFR-4); prompt updates for the 6 workflow commands (FR-8).
3. Write the two owned shared artifacts (`ExternalSpecDomain.md`,
   `ExternalConfigContract.md`) and the changelog entry for the cross-spec
   `ContextResultContract.md` mutation (OQ-1).
4. Resolve OQ-2…OQ-5 (recommendations: validate at link time; commit `specsDir`;
   `external set` warns on breaking `external_reads`; `external list` all-specs view
   can wait for post-1.0).

Also: check off the stale T-10 in `001-workflow-test-suite/tasks.md`
(`validate.test.ts` exists — the box was never ticked).

---

## Phase 4 — Modernise the AI-engine integrations (P1)

The reason the project "isn't bleeding edge anymore": Claude Code has moved from bare
`.claude/commands/*.md` slash commands to **skills** and **plugins**.

- **Claude engine:** emit skills — `.claude/skills/relic-<cmd>/SKILL.md` with YAML
  frontmatter (`name`, `description` written so Claude can auto-invoke the right
  workflow, `allowed-tools` limited to `Bash(relic *)` + file tools). Keep writing
  `.claude/commands/` for one release for backward compatibility, then deprecate.
  Verify against current Claude Code docs at implementation time.
- **Plugin packaging (stretch):** a Relic plugin (commands + skills + hooks in one
  installable unit) would replace per-project file copying entirely. Evaluate; don't
  block 1.0 on it.
- **Codex engine:** verify `.codex/commands/` + `config.toml` `prefix_rules` still match
  current Codex CLI conventions; add `AGENTS.md` emission if that is now the canonical
  hook.
- **Copilot engine:** `.github/prompts/*.prompt.md` is current — verify frontmatter
  schema, no structural change expected.
- Prompts are the sole source of truth (`templates/prompts/`) — the engine layer only
  changes packaging, not content. Update `add-engine` tests accordingly.

---

## Phase 5 — Hardening, docs, release hygiene (P2)

- **Test pollution:** root `bun test` fails 8 engine tests that pass in isolation
  (shared tmp-dir/cwd leakage between suites). Isolate fixtures so both `bun test` and
  `bun run test` are green.
- **Docs refresh:** rewrite `CLAUDE.md` to match reality (session.json, 12 prompts,
  current command list incl. `write`, `mode`, `upgrade`, `ask`, `solve`, search flags,
  toon manifests, fix pipeline); refresh `README.md` and `docs/*` for html mode and the
  fix/solve pipeline.
- **Open questions:** the CLAUDE.md "Open Questions" list is mostly answered by specs
  003–008 — resolve each in writing or explicitly defer to post-1.0.
- **Preamble/upgrade path:** confirm `relic upgrade` refreshes `preamble.md`,
  `base.html`, and engine files in user projects, and that old projects survive the
  4→5 file rule change.

---

## Phase 6 — Ship 1.0.0

1. All phases above merged; `bun test`, `bun run test`, `tsc --noEmit` green.
2. Manual smoke: `relic init` (md + html modes) in a throwaway project; run the full
   forward lifecycle and one fix/solve cycle in Claude Code; open the generated HTML in
   a browser (light + dark, file:// and HTTP) with at least one flow diagram.
3. `bun run publish` → v1.0.0 tag → npm + PyPI. Announce breaking-change notes:
   none expected for md-mode users; html-mode users get auto re-based HTML.
4. Post-1.0 backlog: Homebrew tap, Claude plugin packaging, multiple external repos,
   `relic external list` across specs, flow-renderer layout improvements.

---

## Suggested order of execution

| # | Work | Size | Ships as |
|---|---|---|---|
| 1 | Phase 1 (base.html fixes + html-sync) + Phase 2 (allowlist) | M | 0.9.0 |
| 2 | Phase 3 (spec 009) | M | 0.9.x |
| 3 | Phase 4 (engines/skills) | M | 0.10.0 |
| 4 | Phase 5 (hardening + docs) | S | 0.10.x |
| 5 | Phase 6 (release) | S | **1.0.0** |
