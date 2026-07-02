# ClaudePluginContract

**Type:** contract
**Owned by:** 011-claude-plugin
**Confidence:** high — schemas verified against code.claude.com/docs (plugins-reference, plugin-marketplaces) on 2026-07-02

## Description

The contract for the first-party `relic` Claude Code plugin: repository layout, manifest
and marketplace shapes, command generation rules, ambient skill requirements, the
autonomy ladder, and the engine-transition behaviour that retires per-project Claude
command copies. Supersedes `SkillExtractionContract.md` (2026-07-02).

## Plugin Layout (in the relic repository)

```
plugin/
  .claude-plugin/
    plugin.json           ← manifest (schema below)
  commands/               ← GENERATED from templates/prompts/*.md — committed, never hand-edited
    specify.md … ask.md      (simple markdown files → /relic:<name> shortcuts)
  skills/                 ← AUTHORED — Claude-native ambient skills (directories with SKILL.md)
    relic-knowledge-first/SKILL.md
    relic-spec-detector/SKILL.md
    relic-fix-pipeline/SKILL.md
    relic-doc-keeper/SKILL.md
.claude-plugin/
  marketplace.json        ← repo root — the relic repo is its own marketplace
```

### Verified schemas (docs 2026-07-02)

`plugin/.claude-plugin/plugin.json` — `name` is the only required field:

```json
{
  "name": "relic",
  "displayName": "Relic",
  "version": "<synced with CLI by scripts/publish.ts>",
  "description": "Spec-driven development with a shared artifact layer — ambient SDD for Claude Code",
  "author": { "name": "Filipe Ferreira Paulo", "url": "https://github.com/filfp/relic" },
  "repository": "https://github.com/filfp/relic",
  "license": "MIT",
  "keywords": ["sdd", "specs", "documentation"]
}
```

Setting `version` pins updates — users receive a new plugin version only when it is bumped
(otherwise every commit SHA counts as a version). `claude plugin validate ./plugin --strict`
runs in CI.

`.claude-plugin/marketplace.json` (repo root; relative sources resolve from the marketplace
root — the directory containing `.claude-plugin/`):

```json
{
  "name": "relic",
  "owner": { "name": "Filipe Ferreira Paulo" },
  "plugins": [
    {
      "name": "relic",
      "source": "./plugin",
      "description": "Relic SDD: workflow commands + ambient skills"
    }
  ]
}
```

Manual install: `/plugin marketplace add filfp/relic` → `/plugin install relic@relic`.
Components are namespaced by plugin name: commands surface as `/relic:specify`,
`/relic:plan`, etc. `${CLAUDE_PLUGIN_ROOT}` resolves to the installed plugin directory in
any bundled script.

## Command Generation Rules

- Source of truth stays `templates/prompts/*.md` (shared with Copilot/Codex engines).
- `scripts/build-plugin.ts` prepends YAML frontmatter: `description` (one line derived
  from the command's purpose) and `allowed-tools` including `Bash(relic *)`. Body travels
  verbatim — including `<!-- include: relic snippet <name> -->` directives, which the LLM
  resolves at runtime exactly as before.
- Generated files are committed; the build asserts freshness (CI fails on drift).
- `scripts/publish.ts` bumps `plugin.json` `version` in lockstep with the CLI version.

## Ambient Skill Requirements

Each `plugin/skills/<name>/SKILL.md`:

1. `description` frontmatter written as a **situation** ("when the user requests a new
   capability in a project containing .relic/"), because it is the auto-invocation trigger.
2. Opens with the two universal guards: **inactive when the project has no `.relic/`**
   (zero noise for non-relic users); **CLI missing → run the bootstrap (below), never
   block the user's actual request**.
3. States the autonomy ladder and checks the knob before structural actions:

| Class | Examples | `sdd: auto` (default) | `sdd: suggest` |
|---|---|---|---|
| Read | `relic search`, loading artifacts | silent | silent |
| Maintain | task checkoffs, changelog, owned-artifact sync, HTML refresh | automatic | automatic |
| Structural | new spec, new shared artifact, ownership/contract changes | **announce, then do** | ask one line first |

4. Announcements are one line, before the action, naming the artifact. Never silent for
   structural actions; never a blocking question in `auto` mode.
5. Skills are self-contained (no runtime includes) — the shared guard/ladder block is
   kept identical across the four files by a `build-plugin.ts` assertion.

## `config.json` — `sdd` Knob

```json
{ "engines": ["claude"], "mode": "html", "sdd": "auto" }
```

`"sdd"`: `"auto"` (default when absent) or `"suggest"`. Exposed as `sdd` in `relic
context` output (additive amendment to `ContextResultContract.md`, owned by 003, and
`ProjectConfigDomain.md`, owned by 008 — changelog-tracked).

## CLI Bootstrap (first use)

The CLI is the deterministic backbone — the plugin cannot function without it, and the
CLI surface will keep growing. The plugin therefore owns CLI onboarding:

- **Every plugin command and skill starts with an availability check** (`relic --version`).
  When the CLI is missing, ask the user **once per session** for consent to install —
  npm (`npm install -g relic-cli`) or uv (`uv tool install relic-cli`), picking whichever
  toolchain is present — then run the chosen install and continue the original request.
  Declining is respected for the rest of the session; the user's actual request proceeds
  as far as possible without relic.
- **`/relic:setup`** — an authored onboarding command in the plugin: installs the CLI if
  missing (same consent flow), runs `relic init` if the project has no `.relic/`, and
  reports what was configured. This is the one-command path from "installed the plugin"
  to "project is spec-aware".
- Install is always consent-gated — the plugin never installs software silently.

## Per-Project Installation Model

The plugin is enabled **per project**, not globally. `relic add-engine claude` (and
`relic init --engine claude`) write the project's `.claude/settings.json`:

```json
{
  "permissions": { "allow": ["Bash(relic *)"] },
  "extraKnownMarketplaces": {
    "relic": { "source": { "source": "github", "repo": "filfp/relic" } }
  },
  "enabledPlugins": { "relic@relic": true }
}
```

Everyone opening the project gets the marketplace known and the plugin enabled — the
committed settings file is the per-project installation. (Marketplace state is cached
per user under `~/.claude/plugins/`; enablement is what the project controls.)

## Command Spelling — Single Form

`/relic:command` (the plugin namespace form) is the **only** documented spelling from
this spec onward. All templates, docs, README, and engine instruction files are updated;
`/relic.command` remains only in historical records (changelog, old fix documents).
There is no dual-spelling compatibility period — confirmed 2026-07-02 (no non-Claude
users exist yet).

## HTML Files — Out of Scope

Ambient skills (including `relic-doc-keeper`) do **not** create, refresh, or edit spec
HTML files. The HTML surface is frozen for this spec pending a separate reshape
(owner decision, 2026-07-02). `relic scaffold`'s built-in chrome/source sync remains the
only HTML-touching mechanism, as shipped by spec 008/Phase 1.

## Engine Transition

- `relic init --engine claude` / `relic add-engine claude`: **no command files written.**
  They write the `Bash(relic *)` permission into `.claude/settings.json` (unchanged
  behaviour), add `extraKnownMarketplaces.relic` + `enabledPlugins."relic@relic"` (shapes
  above), and print manual install instructions.
- `relic upgrade --clean`: removes relic-managed `.claude/commands/relic.*.md` copies,
  reporting each removal. Gated behind `--clean` for one minor version (OQ-4), then
  default. Only files matching the relic-managed pattern are touched — user-maintained
  files are never deleted.
- Copilot and Codex engines are unchanged; they receive the ambient-SDD practice through
  `templates/preamble.md` at suggest-level autonomy.

## Invariants

- The plugin never writes outside `.relic/`, configured external spec directories, and
  the source tree the user asked to change.
- Everything works without the plugin: CLI, Copilot/Codex engines, and md-mode projects
  have zero plugin dependencies.
- Ambient skills never fire in projects without `.relic/`.
- Generated `plugin/commands/` files are never edited by hand — prompts are the source.
