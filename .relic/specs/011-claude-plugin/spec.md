# Spec: Claude Plugin — Ambient SDD

**Spec ID:** 011-claude-plugin
**Created:** 2026-06-02 (as 011-skill-extraction)
**Reframed:** 2026-07-02 — plugin delivery + ambient SDD supersede skill extraction
**Status:** draft

---

## Overview

Every Relic integration so far treats SDD as a **separate flow the developer must actively
enter**: type `/relic.specify`, type `/relic.fix`, remember to update the spec. The previous
version of this spec (skill extraction) improved the mechanics — procedures as skills,
proactive suggestions — but kept the same posture: Relic waits to be invited, and its
proactive skills were explicitly forbidden from acting without confirmation.

This spec inverts the posture. Two shifts, one delivery vehicle:

**Shift 1 — Delivery: a first-party Claude Code plugin.** Relic ships as an installable,
versioned plugin (commands + skills in one unit, distributed from the relic repository via
the Claude Code marketplace mechanism). This replaces copying 12 command files into every
project: no more per-project `.claude/commands/relic.*.md`, no more `relic upgrade`
rewriting prompt copies, and the file-ownership boundary inside `.claude/` disappears
structurally — plugin files live in the plugin. The CLI remains the deterministic backbone;
plugin commands and skills call it.

**Shift 2 — Behaviour: SDD as Claude's own working practice.** The plugin's skills do not
*suggest* Relic workflows — they make `.relic/` the way Claude documents and contextualises
its own work in any project that has it. Searching the brain before exploring code, opening
a spec when the user asks for a new capability, routing bug reports through the fix
pipeline, and keeping tasks/spec/changelog true after implementing are not features the
user requests: they are how Claude works. SDD becomes ambient — part of the day-to-day
development loop, not a ceremony the developer must remember to perform.

**The autonomy model is graduated, not gated.** Reading is silent; maintaining existing
documentation is automatic; structural changes are automatic **with announcement** — Claude
states what it is doing ("this is a new capability — creating spec `012-report-exports`")
and proceeds. A project-level knob lets stricter teams downgrade structural actions to
ask-first.

---

## Requirements

### Functional — plugin packaging

- **FR-1:** The relic repository gains a `plugin/` directory containing a complete Claude
  Code plugin named `relic`: `.claude-plugin/plugin.json` (name, description, version,
  author), `commands/` (the 12 workflow commands), and `skills/` (the ambient skills).
  Exact manifest schema is verified against current Claude Code plugin documentation at
  implementation time.
- **FR-2:** Plugin commands are **generated** from `templates/prompts/*.md` by a build
  script (`scripts/build-plugin.ts`) so prompts keep a single source of truth shared with
  the Copilot/Codex engines. The generator adds command frontmatter (description,
  `allowed-tools` including `Bash(relic *)`). Snippet include directives travel verbatim —
  runtime resolution via `relic snippet` is unchanged.
- **FR-3:** The relic repository doubles as its own marketplace: a
  `.claude-plugin/marketplace.json` at the repo root lists the `relic` plugin, so
  installation is `/plugin marketplace add filfp/relic` followed by
  `/plugin install relic@relic`. Plugin version is bumped by `scripts/publish.ts` in lockstep
  with the CLI version.
- **FR-4:** Ambient skills are authored directly in `plugin/skills/<name>/SKILL.md`
  (Claude-only surface — no embedding step needed; the plugin is distributed as repo
  files). Each skill has `description` frontmatter written for Claude Code's native
  auto-invocation, plus supporting files as needed.

### Functional — ambient skills (v1 set)

- **FR-5: `relic-knowledge-first`** — whenever Claude needs project context in a repo
  containing `.relic/` (before exploring code, answering questions about behaviour,
  planning changes), it consults `relic search` first and loads matching artifacts. The
  brain is the primary context source; the filesystem is the fallback. Silent.
- **FR-6: `relic-spec-detector`** — when the user's request is clearly a **new capability**
  (not a tweak to an existing spec's scope), Claude opens the spec as the first step of the
  work: announce, run the specify flow, then continue into planning/implementation as the
  conversation demands. When the request extends an existing spec, route to clarify
  instead. Announced, not asked.
- **FR-7: `relic-fix-pipeline`** — when the user reports a bug or Claude encounters a
  defect in spec-owned code, the fix diagnosis pipeline (`/relic.fix` semantics: owning
  spec, classification, fix document) **is** the debugging method. Solve follows per the
  autonomy ladder. Announced.
- **FR-8: `relic-doc-keeper`** — after implementing or materially changing spec-owned
  code, Claude closes the loop without being asked: check off tasks, record plan/spec
  drift, amend owned shared artifacts, write required changelog entries, refresh the spec
  HTML (via `relic scaffold`/`html-sync`). This is part of finishing the work, not a
  separate chore. Silent for pure upkeep; announced when an artifact's meaning changes.
- **FR-9:** Every ambient skill degrades gracefully: no `.relic/` directory → the skill
  stays inactive (no nagging to adopt Relic); `relic` CLI missing → mention the install
  command once, never block non-relic work.

### Functional — autonomy ladder

- **FR-10:** Three action classes govern every ambient behaviour:
  | Class | Examples | Policy |
  |---|---|---|
  | **Read** | `relic search`, loading artifacts/specs/fix docs | always automatic, silent |
  | **Maintain** | task checkoffs, changelog entries, owned-artifact sync, HTML refresh | automatic as part of the work |
  | **Structural** | new spec, new shared artifact, ownership claims, contract changes affecting other specs' `reads` | automatic **with announcement** before proceeding |
- **FR-11:** `config.json` gains an optional `"sdd"` field: `"auto"` (default — the ladder
  above) or `"suggest"` (structural actions ask a one-line confirmation first; read and
  maintain unchanged). `relic context` exposes the resolved value as `sdd` so skills read
  it without parsing config.
- **FR-12:** Announcements are one line, before the action, naming the artifact ("Creating
  spec `012-report-exports` — this is a new capability" / "Amending `AuthAPI.md` — the
  contract changed; specs 003 and 007 read it"). Never silent for structural, never a
  blocking question in `"auto"` mode.

### Functional — engine transition

- **FR-13:** `relic init --engine claude` and `relic add-engine claude` stop writing
  `.claude/commands/relic.*.md`. They now: (a) keep writing the `Bash(relic *)` permission
  into `.claude/settings.json`; (b) write the plugin recommendation keys into
  `.claude/settings.json` (marketplace + enabled-plugin entries — exact keys verified
  against current docs at implementation time) so teammates opening the project are
  prompted to install the plugin; (c) print the manual install instructions.
- **FR-14:** `relic upgrade` removes superseded relic-managed command copies
  (`.claude/commands/relic.*.md`) when refreshing a project whose engine list includes
  claude, reporting each removal. Only files matching the relic-managed pattern are
  touched — the ownership boundary (relic never deletes user-maintained files) stands.
- **FR-15:** Copilot and Codex engines are mechanically unchanged. The ambient-SDD
  practice text added to `templates/preamble.md` (FR-16) reaches them through the existing
  prompt/preamble channel, at suggest-level autonomy (no skill auto-invocation exists
  there).
- **FR-16:** `templates/preamble.md` gains an **Ambient SDD** section documenting the
  practice and the autonomy ladder — the philosophy lives in the knowledge layer, not only
  in plugin skills.

### Non-Functional

- **NFR-1:** The plugin is self-contained after install — no network access needed at
  runtime beyond what the CLI itself does.
- **NFR-2:** Plugin skills and commands never write outside `.relic/`, the external spec
  directories (per spec 009 rules), and the project source tree the user asked to change.
- **NFR-3:** Ambient skills must not fire in projects without `.relic/` (zero noise for
  non-relic users) and must never block or delay the user's primary request.
- **NFR-4:** Command UX: plugin commands are invoked with the plugin namespace
  (`/relic:specify` form). All user-facing references in prompts, README, and docs are
  updated; the old `/relic.specify` spelling remains only in historical records
  (changelog, old fix docs).
- **NFR-5:** The plugin works offline against a local marketplace clone; teams may fork
  the repo and point the marketplace at their fork.
- **NFR-6:** Everything remains functional without the plugin: the CLI and the
  Copilot/Codex engines have no dependency on any plugin file.

---

## User Stories

- As a **developer**, I install one plugin and every project I open with a `.relic/`
  directory is automatically spec-aware — no per-project setup, no command files in my
  repo.
- As a **developer**, when I ask Claude for a new feature, the spec appears as the natural
  first artifact of the work — announced, not requested — and the implementation follows
  it.
- As a **developer**, when I paste a stack trace, Claude diagnoses it through the owning
  spec's contracts and decisions, and the fix document is just *there* afterwards.
- As a **tech lead**, I set `"sdd": "suggest"` in `config.json` and Claude asks before
  creating specs or changing contracts, while still keeping tasks and changelogs current
  automatically.
- As a **team**, we update the plugin once (or pull the marketplace) and every member gets
  the new workflow version — nothing to re-copy into repos.
- As a **maintainer of relic**, I publish one version bump and the CLI, prompts, and
  plugin stay in lockstep.

---

## Scope

### In Scope

- `plugin/` directory: manifest, generated commands, authored skills
- `.claude-plugin/marketplace.json` at repo root (repo as its own marketplace)
- `scripts/build-plugin.ts` — prompts → plugin commands generation (frontmatter added)
- Four ambient skills: `relic-knowledge-first`, `relic-spec-detector`,
  `relic-fix-pipeline`, `relic-doc-keeper`
- Autonomy ladder + `config.json` `"sdd"` knob + `relic context` `sdd` field
- Claude engine rewrite (settings + plugin recommendation, no command copies) and
  `relic upgrade` cleanup of superseded copies
- `templates/preamble.md` Ambient SDD section
- Publish-script version sync; README/docs install path update

### Out of Scope

- Hooks (SessionStart context injection, PostToolUse doc-freshness enforcement) — deferred
  to a follow-up spec after v1 field experience
- Sub-agents shipped in the plugin
- MCP servers in the plugin
- Migrating Copilot/Codex to any plugin-like mechanism
- Marketplace distribution beyond the relic repo itself (no registry submission)
- Auto-installing the relic CLI from the plugin
- Adoption nudges in projects without `.relic/`

---

## Shared Artifacts

**Owns:**
- `shared/contracts/ClaudePluginContract.md` — plugin layout, marketplace manifest,
  command generation rules, skill frontmatter requirements, autonomy ladder, engine
  transition behaviour
- `shared/contracts/SkillExtractionContract.md` — superseded 2026-07-02; retained as a
  historical record pointing to `ClaudePluginContract.md`

**Reads:**
- `shared/contracts/SnippetIncludeContract.md` (owned by 010) — include directives travel
  verbatim into generated plugin commands
- `shared/domains/TemplateDomain.md` — prompts remain the single source of truth
- `shared/domains/ProjectConfigDomain.md` (owned by 008) — extended with the `"sdd"` field
- `shared/contracts/ContextResultContract.md` (owned by 003) — extended with the `sdd`
  field (cross-spec, additive; changelog required)

---

## Open Questions

- [ ] **OQ-1:** Exact `plugin.json` / `marketplace.json` schemas and the settings keys for
  team plugin recommendation must be verified against current Claude Code docs at
  implementation time (first plan task).
- [ ] **OQ-2:** Should `relic-doc-keeper` refresh the spec HTML on every maintenance pass
  or only at natural milestones (task phase completed, session end)? Current lean:
  milestones — `relic scaffold` already syncs chrome/sources on every workflow entry.
- [ ] **OQ-3:** Does the `/relic:command` namespace collide with the historical
  `/relic.command` spelling anywhere that matters (docs, engine instructions for
  Copilot/Codex which keep the old spelling)? Audit at implementation.
- [ ] **OQ-4:** Should `relic upgrade`'s removal of superseded command copies be gated
  behind a `--clean` flag for the first release? Current lean: yes for one minor version,
  then default.

---

## Decisions

- **D-1 (2026-07-02):** Autonomy model is **auto + announce** with a `"sdd"` config knob
  (`"auto"` default, `"suggest"` for ask-first structural actions). Confirmed with the
  project owner.
- **D-2 (2026-07-02):** The plugin **replaces** per-project Claude command files — clean
  break at 1.0. `add-engine claude` becomes settings + recommendation + instructions.
- **D-3 (2026-07-02):** v1 ships **skills only** — no hooks. Hooks are a follow-up spec.
- **D-4 (2026-07-02):** v1 ambient skill set is all four: knowledge-first, spec-detector,
  fix-pipeline, doc-keeper.
- **D-5:** Prompts stay the single source of truth in `templates/prompts/`; the plugin
  build generates its commands from them. Skills are plugin-native (authored in
  `plugin/skills/`).
- **D-6:** The relic repo is its own marketplace — no external registry dependency.
