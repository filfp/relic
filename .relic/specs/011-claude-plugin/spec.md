# Spec: Claude Plugin — Ambient SDD

**Spec ID:** 011-claude-plugin
**Created:** 2026-06-02 (as 011-skill-extraction)
**Reframed:** 2026-07-02 — plugin delivery + ambient SDD supersede skill extraction
**Status:** implemented

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
  Schemas verified against live docs 2026-07-02 and recorded in
  `ClaudePluginContract.md` (OQ-1). `claude plugin validate ./plugin --strict` runs in CI.
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
  drift, amend owned shared artifacts, write required changelog entries. **HTML files are
  explicitly out of scope** — the HTML surface is frozen pending a separate reshape
  (OQ-2 resolution); `relic scaffold`'s built-in sync remains the only HTML-touching
  mechanism. Silent for pure upkeep; announced when an artifact's meaning changes.
- **FR-9:** Every ambient skill degrades gracefully: no `.relic/` directory → the skill
  stays inactive (no nagging to adopt Relic); `relic` CLI missing → run the consent-gated
  CLI bootstrap (FR-17), and never block non-relic work.

### Functional — autonomy ladder

- **FR-10:** Three action classes govern every ambient behaviour:
  | Class | Examples | Policy |
  |---|---|---|
  | **Read** | `relic search`, loading artifacts/specs/fix docs | always automatic, silent |
  | **Maintain** | task checkoffs, changelog entries, owned-artifact sync | automatic as part of the work |
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
  into `.claude/settings.json`; (b) write `extraKnownMarketplaces.relic` (github source
  `filfp/relic`) and `enabledPlugins."relic@relic": true` into the same file — the
  committed settings file **is** the per-project installation (verified against docs
  2026-07-02); (c) print the manual install instructions
  (`/plugin marketplace add filfp/relic` → `/plugin install relic@relic`).
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

### Functional — CLI bootstrap

- **FR-17:** The CLI is the backbone of every flow and its surface will keep growing —
  the plugin owns CLI onboarding. Every plugin command and ambient skill begins with an
  availability check (`relic --version`). When missing, ask the user **once per session**
  for consent to install (npm or uv, whichever toolchain is present), run the install on
  consent, then continue the original request. Declining is respected for the session.
  Installation is never silent.
- **FR-18:** `/relic:setup` — an authored onboarding command in the plugin: installs the
  CLI if missing (FR-17 consent flow), runs `relic init` when the project has no
  `.relic/`, and reports what was configured. One command from plugin-installed to
  project-spec-aware.

### Non-Functional

- **NFR-1:** The plugin is self-contained after install — no network access needed at
  runtime beyond what the CLI itself does.
- **NFR-2:** Plugin skills and commands never write outside `.relic/`, the external spec
  directories (per spec 009 rules), and the project source tree the user asked to change.
- **NFR-3:** Ambient skills must not fire in projects without `.relic/` (zero noise for
  non-relic users) and must never block or delay the user's primary request.
- **NFR-4:** Command UX: `/relic:command` (plugin namespace form, verified) is the
  **single** documented spelling. All references in templates, README, docs, and engine
  instruction files are renamed in one pass — no dual-spelling compatibility period
  (no non-Claude users exist yet; owner decision 2026-07-02). The old `/relic.command`
  spelling remains only in historical records (changelog, old fix docs).
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
- CLI bootstrap: consent-gated first-use install (FR-17) + `/relic:setup` onboarding
  command (FR-18); per-project plugin enablement via committed `.claude/settings.json`
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
- Silent (non-consented) CLI installation
- Adoption nudges in projects without `.relic/`
- Any creation, refresh, or edit of spec HTML files (surface frozen pending a separate
  HTML reshape spec — owner decision 2026-07-02)

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

- [x] **OQ-1:** **Resolved 2026-07-02** — schemas verified against code.claude.com/docs
  (plugins-reference, plugin-marketplaces) and recorded in `ClaudePluginContract.md`:
  `plugin.json` (only `name` required; `version` pins updates), `marketplace.json`
  (`plugins[].source: "./plugin"` relative form), per-project enablement via
  `extraKnownMarketplaces` + `enabledPlugins` in project settings, `/relic:command`
  namespacing, `claude plugin validate --strict` for CI.
- [x] **OQ-2:** **Resolved → HTML untouched in this spec.** The owner is planning a
  separate HTML reshape; ambient skills never create/refresh/edit spec HTML. Only
  `relic scaffold`'s existing built-in sync touches HTML.
- [x] **OQ-3:** **Resolved → single spelling.** `/relic.command` is renamed to
  `/relic:command` everywhere in one pass (templates, docs, engine instructions) — no
  compatibility period, since no users are on non-Claude engines yet.
- [x] **OQ-4:** **Resolved → yes,** gated behind `relic upgrade --clean` for the first
  release, becoming default afterwards; removal reports each file and only ever matches
  the relic-managed pattern.

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
- **D-7 (2026-07-02):** The plugin is installed **per project** — `add-engine claude`
  writes the marketplace + enablement keys into the project's committed
  `.claude/settings.json`; opening the project activates the plugin for every teammate.
- **D-8 (2026-07-02):** The plugin owns CLI onboarding: consent-gated auto-install on
  first use (FR-17) plus the `/relic:setup` onboarding command (FR-18). The CLI remains
  the backbone; the plugin is the delivery vehicle, never the sole carrier of relic
  functionality.
- **D-9 (2026-07-02):** Spec HTML files are frozen for this spec — a dedicated HTML
  reshape spec follows after this plan completes.
