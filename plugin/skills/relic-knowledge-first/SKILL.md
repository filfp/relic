---
name: relic-knowledge-first
description: "Consult the project's Relic knowledge layer before exploring code. Use before answering questions about how the system works, planning changes, debugging, or gathering project context in any repository that contains a .relic/ directory."
---

# Relic: knowledge first

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

The `.relic/` directory is this project's brain — domains, contracts, rules, assumptions,
specs, and past fixes, indexed for search. It is your **primary context source**; the
filesystem is the fallback, not the starting point.

1. Extract up to 10 keywords from the question or task (entities, domain terms, verbs,
   technical concepts).
2. Run `relic search <keywords>`. Each result line is
   `<source> | <name> | <path> | <tags> | <tldr> | <score>`.
3. Read the full files (by `path`, relative to `.relic/`) for every result whose `tldr`
   is relevant — highest score first.
4. If nothing relevant returns, run `relic search --deep` and triage by `tldr` only.
   Only after the brain comes up empty do you fall back to exploring the codebase, and
   whatever you learn there that the brain should have known is a candidate artifact
   (structural action — see the ladder).
5. Ground your answers in what you read: cite artifact names and paths.

This is a read-class activity: do it silently, as a reflex, on every task that needs
project understanding.

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
