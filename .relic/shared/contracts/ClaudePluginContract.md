# ClaudePluginContract

**Type:** contract
**Owned by:** 011-claude-plugin
**Confidence:** medium — schema fields marked *verify* are pinned against live Claude Code docs in implementation Phase 1

## Description

The contract for the first-party `relic` Claude Code plugin: repository layout, manifest
and marketplace shapes, command generation rules, ambient skill requirements, the
autonomy ladder, and the engine-transition behaviour that retires per-project Claude
command copies. Supersedes `SkillExtractionContract.md` (2026-07-02).

## Plugin Layout (in the relic repository)

```
plugin/
  .claude-plugin/
    plugin.json           ← manifest: name "relic", description, version, author (*verify fields*)
  commands/               ← GENERATED from templates/prompts/*.md — committed, never hand-edited
    specify.md … ask.md
  skills/                 ← AUTHORED — Claude-native ambient skills
    relic-knowledge-first/SKILL.md
    relic-spec-detector/SKILL.md
    relic-fix-pipeline/SKILL.md
    relic-doc-keeper/SKILL.md
.claude-plugin/
  marketplace.json        ← repo root — the relic repo is its own marketplace (*verify schema*)
```

Install path: `/plugin marketplace add filfp/relic` → `/plugin install relic@relic`
(*verify exact invocations*). Plugin commands are namespaced (`/relic:specify` form —
*verify separator*).

## Command Generation Rules

- Source of truth stays `templates/prompts/*.md` (shared with Copilot/Codex engines).
- `scripts/build-plugin.ts` prepends YAML frontmatter: `description` (one line derived
  from the command's purpose) and `allowed-tools` including `Bash(relic *)` (*verify
  field names*). Body travels verbatim — including `<!-- include: relic snippet <name> -->`
  directives, which the LLM resolves at runtime exactly as before.
- Generated files are committed; the build asserts freshness (CI fails on drift).
- `scripts/publish.ts` bumps `plugin.json` `version` in lockstep with the CLI version.

## Ambient Skill Requirements

Each `plugin/skills/<name>/SKILL.md`:

1. `description` frontmatter written as a **situation** ("when the user requests a new
   capability in a project containing .relic/"), because it is the auto-invocation trigger.
2. Opens with the two universal guards: **inactive when the project has no `.relic/`**
   (zero noise for non-relic users); **CLI missing → mention the install command once,
   never block the user's actual request**.
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

## Engine Transition

- `relic init --engine claude` / `relic add-engine claude`: **no command files written.**
  They write the `Bash(relic *)` permission into `.claude/settings.json` (unchanged
  behaviour), add the plugin recommendation keys (*verify: marketplace + enabled-plugin
  settings fields*), and print manual install instructions.
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
