---
name: relic-spec-detector
description: "Route new feature work through a Relic spec. Use when the user requests a new feature, capability, or significant behaviour change in a project containing a .relic/ directory \u2014 before writing any code."
---

# Relic: spec detector

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

In a Relic project, **opening the spec is the first step of building the feature** — not
a separate ceremony. When the user asks for new functionality:

1. Decide what this is. Run `relic search <feature keywords>` and read the matching
   specs' `artifacts.json` / spec.md:
   - **Extends an existing spec** (changes its scope, contracts, or behaviours) → follow
     the `/relic:clarify` procedure against the owning spec.
   - **A genuinely new capability** → this is a new spec.
2. For a new spec, apply the ladder (structural): in `sdd: auto`, announce in one line —
   "Creating spec `NNN-slug` — this is a new capability" — and run the `/relic:specify`
   procedure. In `sdd: suggest`, ask first.
3. Then keep moving with the user's actual request: plan (`/relic:plan`), tasks
   (`/relic:tasks`), implementation — as far as the conversation calls for. The spec is
   the vehicle for the work, never a detour from it.

Do not create specs for trivial changes (typos, small refactors, one-line fixes inside an
existing spec's scope) — route those through the owning spec's normal flow.

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
