# Relic — Claude Code Project Context

> Read this file before every session. It contains the architectural context, key
> decisions, and project philosophy for the Relic project itself.
> **This repo dogfoods Relic**: use `relic search` before exploring, follow the
> `.relic/preamble.md` rules, and keep the knowledge layer true (specs, changelog,
> shared artifacts) as you work.

---

## What Relic Is

**Relic** is a spec-driven development (SDD) tool with a **shared artifact layer** — a
"brain" that connects all specs in a project, enabling cross-spec awareness,
intersection detection, and a traceable change history.

Four core insights:

1. **Artifacts over specs** — existing SDD tools (spec-kit, Kiro, OpenSpec) treat specs
   as isolated silos. Relic treats shared artifacts (domains, contracts, rules,
   assumptions) as the atomic unit, with specs as consumers. Intersections between
   features become explicit and detectable.
2. **Specs never die** — the `fix`/`solve` pipeline keeps the spec alive as the lens
   through which bugs are understood and resolved.
3. **Most adoption is brownfield** — `scan` bootstraps the brain from existing code in
   one expensive pass that pays for itself on every later command.
4. **SDD is ambient, not invoked** (spec 011) — in Claude Code, Relic ships as a plugin
   whose skills make the brain Claude's default working practice: search before
   exploring, spec-first for new capabilities, fix-pipeline for bugs, docs closed
   before work is declared done.

---

## The Two-Layer Architecture

- **Intent layer** — `.relic/specs/<NNN-slug>/`: `spec.md`, `plan.md`, `tasks.md`,
  `artifacts.json` (a POINTER file: `owns` / `reads` / `touches_files` /
  `external_reads`), plus `<spec-id>.html` in html mode.
- **Knowledge layer** — `.relic/shared/{domains,contracts,rules,assumptions}/`: the
  brain. Every artifact is registered in its subdir's `manifest.toon` (name | file |
  tags | tldr). Specs never depend on each other directly — both depend on shared
  artifacts. One spec `owns` an artifact; any spec may `read` it.

Other project files: `preamble.md` (invariants — machine-refreshed, never hand-edit),
`constitution.md` (project governance, amendable), `changelog.md` (append-only — write
via `relic write --changelog`, never directly), `config.json` (engines, `mode`,
`sdd`, `external`), `session.json` (gitignored per-user state: active spec + fix),
`fixes/` (fix documents + manifest), `base.html` (component library reference copy,
machine-refreshed).

### Spec resolution order (all commands)

`--spec` arg → `RELIC_SPEC` env → `session.json` → git branch `NNN-slug` inference →
error listing available specs.

---

## Monorepo Layout

```
packages/
  utility/        @relic/utility — dependency floor: fs, spec-id, toon codec,
                  session, project-config (mode/sdd/external), fetch
  engines/        @relic/engines — engine writers (claude = plugin-era settings;
                  copilot = .github/prompts/*.prompt.md; codex = .codex/commands/ +
                  config.toml); generated/engine-templates.ts (ENGINE_TEMPLATES +
                  SNIPPETS, baked by scripts/embed-engine-templates.ts)
  core/           @relic/core — all commands + core logic (artifact-registry,
                  intersection, changelog, context-builder, html-rebase);
                  generated/templates.ts (scaffold + external doc templates, baked
                  by scripts/embed-templates.ts)
  cli-node/       relic-cli npm package — bin.ts (production), bin.debug.ts (adds
                  AI-workflow stubs)
  cli-python/     PyPI wheel packaging (pre-compiled platform binaries)
plugin/           Claude Code plugin (spec 011): .claude-plugin/plugin.json,
                  commands/ (12 GENERATED from templates/prompts + authored
                  setup.md), skills/ (4 authored ambient skills)
.claude-plugin/   marketplace.json — this repo is its own plugin marketplace
templates/
  prompts/        12 AI command prompts — SINGLE SOURCE OF TRUTH (consumed by the
                  plugin build and the copilot/codex engines)
  snippets/       10 shared prompt fragments, resolved at LLM runtime via
                  `relic snippet <name>` (<!-- include: relic snippet X --> directives)
  external/       6 document templates (fr/nfr/br/adr/us/epic) for `relic external create`
  base.html       spec-HTML chrome + component library (machine-managed regions)
  preamble.md / constitution.md / spec.md / plan.md / tasks.md
scripts/
  embed-templates.ts / embed-engine-templates.ts / build-plugin.ts (generation +
  --check freshness + skill shared-block assertions) / publish.ts (bumps 7 version
  sites incl. plugin.json) / fix-shebang.mjs
```

**Build chain:** `bun run build:templates` = embed engine templates → embed scaffold
templates → build plugin commands. Generated dirs (`packages/*/src/generated/`) are
gitignored; `plugin/commands/` is **committed** (repo must be installable as a
marketplace) and CI enforces freshness via `build-plugin.ts --check`.

---

## CLI Command Surface (production `bin.ts`)

| Command | Purpose |
|---|---|
| `relic init [--dir] [--engine] [--force] [--external-<type> <path>]` | Scaffold `.relic/` |
| `relic add-engine <claude\|copilot\|codex>` | Add engine hooks (claude = settings + plugin enablement only) |
| `relic use [spec-id] [--fix id] [--clear-fix]` | Set active spec/fix in `session.json` |
| `relic scan [--json]` | Project manifest for the `/relic:scan` bootstrap |
| `relic context [--spec id] [--text]` | Resolve spec; files, shared artifacts, `mode`, `sdd`, `external`, `external_reads`, `current_fix` |
| `relic scaffold [--title t\|--spec id]` | Ensure spec folder; create from templates; html create/sync + source embed |
| `relic validate [--text]` | Ownership conflicts, missing artifacts, illegal spec files, manifest health, hard `external_errors` |
| `relic search <kw...> [--deep] [--knowledge\|--spec\|--fix]` | Scored search over all three toon index spaces |
| `relic write --changelog\|--specs\|--fixes\|--knowledge-* --payload <json>` | Structured writes — the ONLY way manifests/changelog are mutated |
| `relic snippet <name>` | Print a snippet (LLM runtime include resolution, nested) |
| `relic mode [md\|html] [--text]` | Get/set artifact mode; refreshes `base.html` on html |
| `relic html-sync [--spec id] [--text]` | Re-base spec HTML chrome onto current template + embed md sources |
| `relic external [init\|set\|link\|create\|list] [--text]` | External spec repo integration (spec 009) |
| `relic upgrade [--check] [--prompts] [--clean] [--text]` | Upgrade CLI + refresh hooks/preamble/html; `--clean` removes pre-plugin command copies |

`bin.debug.ts` adds stubs for the 9 AI workflow commands. Convention: **JSON output by
default, `--text` for humans** (Constitution Principle V).

---

## AI Integration

### Claude Code — plugin (spec 011)

Install: `/plugin marketplace add filfp/relic` → `/plugin install relic@relic`, or let
the committed `.claude/settings.json` (written by `relic init --engine claude`) enable
it per-project via `extraKnownMarketplaces` + `enabledPlugins`. Commands are namespaced
`/relic:specify` … `/relic:setup` (13 total). Four ambient skills make SDD the default
practice: `relic-knowledge-first`, `relic-spec-detector`, `relic-fix-pipeline`,
`relic-doc-keeper`. All skills: inactive without `.relic/`; consent-gated CLI bootstrap
(once per session, npm/uv/pip); **never touch spec HTML files**.

### Autonomy ladder (`sdd` knob in config.json)

Read = silent · Maintain (tasks, changelog, owned artifacts) = automatic · Structural
(new spec, ownership, contract changes) = **announce-then-do** in `auto` (default),
ask-first in `suggest`.

### Copilot / Codex

Prompt files written per-project from `templates/prompts/` (with runtime snippet
directives). They receive the ambient-SDD practice via the preamble at suggest-level
autonomy.

### Prompt composition (specs 010/011)

`<!-- include: relic snippet <name> -->` in a prompt = run `relic snippet <name>` and
inline the output (may nest). Snippets live in `templates/snippets/`; prompts stay
DRY. The plugin build adds frontmatter but never alters prompt bodies.

---

## Lifecycles

**Bootstrap:** `relic init` → `/relic:scan` → `/relic:constitution` → specs.
**Forward:** `specify → clarify → plan (intersection discovery, changelog) → analyse
(read-only) → tasks → implement`.
**Feedback:** bug → `/relic:fix` (diagnosis: owning spec via `touches_files` prefix
match, classification `code-bug|misspecification|misunderstanding|wrong-spec`, fix
document in `.relic/fixes/`, activation) → `/relic:solve` (apply, update knowledge
layer, close + clear fix). Contract changes propagate: amend artifact + changelog +
flag reading specs.

**HTML mode** (`mode: "html"` in config.json): each spec folder carries
`<spec-id>.html` — machine-managed chrome (styles/components/reader, sentinel-marked)
with LLM-authored content regions. `relic scaffold`/`html-sync` re-base chrome and
embed md sources deterministically. An HTML reshape is planned as the next spec — do
not invest in the current HTML surface beyond keeping sync green.

**External specs** (spec 009): `config.external` maps doc types
(`fr|nfr|br|adr|us|epic`) to directories (typically a git submodule spec repo).
`external_reads` in `artifacts.json` links docs to specs; workflow prompts hard-stop on
broken entries; `relic external create` writes + commits + auto-links.

---

## Testing & Conventions

- `bun test` (root) and `bun run test` (per-package) must both stay green; CI also runs
  `tsc --noEmit`, `build-plugin.ts --check`, and template embeds.
- **Never `mock.module` a workspace package in tests** — bun module mocks are
  process-global and leak into other packages' test files. Use injection seams
  (`_channel`, `_runAddEngine` in `runUpgrade`).
- Command tests: pass `relicDir` in options; capture `console.log` for JSON output.
- Templates are the source of truth — after editing `templates/**`, run
  `bun run build:templates` (regenerates embeds + plugin commands).
- The preamble instance (`.relic/preamble.md`) must stay byte-identical to
  `templates/preamble.md` (upgrade refresh relies on exact comparison).
- Versioning: `scripts/publish.ts <x.y.z>` bumps 7 sites (root+cli package.json, both
  bins, pyproject, `__init__.py`, plugin.json), tags, pushes; CI publishes npm + PyPI
  on `v*` tags. Plugin updates reach users when the pinned plugin version bumps.

---

## Distribution

| Channel | Package | Notes |
|---|---|---|
| npm | `relic-cli` | Node 18+ bundle (`bun build --target node`) |
| PyPI | `relic-cli` | platform wheels with pre-compiled Bun binaries (macOS ad-hoc codesigned) |
| Claude Code | `relic@relic` plugin | this repo is the marketplace; no separate publish |
| Homebrew | planned | post-1.0 |

---

## Where Decisions Live

This file is deliberately thin on history. The authoritative records:

- `.relic/shared/` — contracts/domains/rules (e.g. `ClaudePluginContract`,
  `ExternalConfigContract`, `HtmlComponentContract`, `SpecFilesAllowlistRule`)
- `.relic/specs/001…011/` — per-feature intent, plans, decisions, open questions
- `.relic/changelog.md` — the append-only audit trail
- `docs/roadmap-1.0.0.md` — current release plan and phase status
- `docs/context.md` / `docs/implementation.md` — ideation history (may lag reality;
  the knowledge layer wins on conflict)
