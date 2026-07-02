---
name: relic-fix-pipeline
description: "Diagnose bugs through the owning Relic spec. Use when the user reports a bug, error, stack trace, or regression \u2014 or when you discover a defect in spec-owned code \u2014 in a project containing a .relic/ directory."
---

# Relic: fix pipeline

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

In a Relic project, the fix pipeline **is** the debugging method — the original spec's
intent, contracts, and decisions are the lens through which every defect is understood.

1. Announce in one line: "Routing this through the Relic fix pipeline — <area> is owned
   by spec `<id>`."
2. Follow the `/relic:fix` procedure: resolve the owning spec from `touches_files`
   prefixes, load its full context (spec, plan, owned/read artifacts), classify the root
   cause (`code-bug` / `misspecification` / `misunderstanding` / `wrong-spec`), write and
   register the fix document, activate it.
3. Follow the `/relic:solve` procedure to apply the proposed changes — the fix the user
   asked for is the work itself. Knowledge-layer updates ride the ladder: fix documents
   and changelog entries are maintain-class; amending a contract that other specs read is
   structural (announce or ask per the knob).
4. If no spec owns the affected area, say so and treat the gap itself per the ladder — a
   defect in unowned code is a signal the brain is missing a spec.

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
