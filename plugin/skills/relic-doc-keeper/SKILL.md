---
name: relic-doc-keeper
description: "Close the Relic documentation loop after code changes. Use after implementing a feature, fixing a bug, or materially changing code in a project containing a .relic/ directory \u2014 before declaring the work done."
---

# Relic: doc keeper

<!-- relic:shared:guards:start -->
## Before anything

1. **Relic project check.** This skill applies only when the project contains a `.relic/`
   directory. If there is none, stop here silently — never suggest adopting Relic.
2. **CLI check.** Run `relic --version`. If the CLI is missing:
   - Ask the user **once per session**: "This project uses Relic, but the `relic` CLI is
     not installed — install it now? (`npm install -g relic-cli` or `uv tool install relic-cli`)"
   - On consent, install with whichever toolchain is available (prefer npm, then uv, then
     pip), verify with `relic --version`, and continue what you were doing.
   - If declined, do not ask again this session; continue the user's request as far as
     possible without Relic. Never install silently; never block the user's actual work.
<!-- relic:shared:guards:end -->

## The practice

Work in a Relic project is finished when the knowledge layer is true again — not when the
code compiles. Before declaring any implementation or fix done:

1. **Tasks** — check off completed items in the active spec's `tasks.md`; add follow-up
   tasks discovered during the work.
2. **Drift** — if the implementation deviated from `plan.md` or revealed `spec.md` is
   stale, record the divergence (update the plan; flag spec changes through the
   `/relic:clarify` procedure when contracts moved).
3. **Owned artifacts** — sync any `shared/` artifact the active spec owns whose content
   the change affected; update its manifest entry if scope shifted.
4. **Changelog** — when a shared artifact, contract, or plan was amended (cross-artifact
   mutation), write the entry via `relic write --changelog` — never edit `changelog.md`
   directly.
5. **Assumptions** — any assumption you made that the spec does not capture goes to
   `shared/assumptions/` before it influences more code.

All of the above is maintain-class: do it automatically as part of finishing, and mention
it in your summary in one line ("Docs closed: 3 tasks checked, changelog entry for
AuthAPI amendment"). Amending artifacts that **other specs read** is structural — ladder
applies. Never create, refresh, or edit spec HTML files.

<!-- relic:shared:ladder:start -->
## Autonomy ladder

Read the `sdd` field from `relic context` output (`auto` when absent).

| Class | Examples | `sdd: auto` (default) | `sdd: suggest` |
|---|---|---|---|
| Read | `relic search`, loading artifacts, specs, fix docs | silent | silent |
| Maintain | task checkoffs, changelog entries, syncing artifacts the active spec owns | automatic — part of the work | automatic |
| Structural | new spec, new shared artifact, ownership claims, contract changes other specs read | **announce in one line, then do** | ask one line, wait for yes |

Announcements name the artifact before acting ("Creating spec `012-report-exports` — this
is a new capability"). Never act silently on a structural change; never turn an
announcement into a blocking question when `sdd` is `auto`.

Spec HTML files are out of bounds for skills — never create, refresh, or edit them
(`relic scaffold` handles HTML upkeep internally).
<!-- relic:shared:ladder:end -->
