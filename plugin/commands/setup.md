---
description: "Set up Relic in this project \u2014 install the CLI if missing and initialise the .relic/ knowledge layer"
allowed-tools: "Bash(relic *)"
---

<!-- AUTHORED — this file is not generated from templates/prompts/. -->

# /relic:setup

One command from "plugin installed" to "project is spec-aware".

## Step 1 — CLI

Run `relic --version`.

If the CLI is missing, ask the user for consent to install it:

> The `relic` CLI powers every Relic flow. Install it now?
> (`npm install -g relic-cli` or `uv tool install relic-cli`)

On consent, install with whichever toolchain is available (prefer npm, then uv, then
pip: `pip install relic-cli`) and verify with `relic --version`. If the user declines,
stop and tell them `/relic:setup` can be re-run any time. Never install silently.

## Step 2 — Project initialisation

Run `relic context` (or check for a `.relic/` directory).

- **`.relic/` exists** — the project is already initialised. Report the active spec,
  mode, and engine configuration from the context output, and skip to Step 3.
- **No `.relic/`** — run `relic init` (add `--engine claude` so the project settings get
  the plugin marketplace + enablement keys and the `Bash(relic *)` permission). Report
  what was created.

## Step 3 — Bootstrap the knowledge layer

If the project already has meaningful code and `.relic/shared/` is empty, recommend the
one-time brain bootstrap and offer to run it now:

- `/relic:scan` — generates the shared artifact layer from the existing codebase
- `/relic:constitution` — extracts the project's coding principles

For a greenfield project, suggest starting with `/relic:specify` when the first feature
arrives.

## Step 4 — Report

Summarise in a few lines: CLI version, what was initialised or already present, and the
recommended next command. From here, Relic works ambiently — specs, fixes, and
documentation upkeep happen as part of normal work.
