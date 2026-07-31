# relic-cli

> Shared project knowledge for coding agents — npm distribution.

Relic keeps the current boundary of a project's knowledge in the repository.
One central skill helps coding agents challenge ideas, explore the code, and
persist only the requirements, decisions, epics, shared knowledge, and
specifications the developer chooses to keep.

## Install

```bash
npm install -g relic-cli
```

Requires Node.js 18+. One-off usage also works:

```bash
npx relic-cli init
```

## Getting started

```bash
cd my-project
relic init
relic install --engine codex
```

Supported engines are `claude`, `copilot`, `codex`, and `agents`. The `codex`
target installs in `.codex/skills`; the portable `agents` target installs in
`.agents/skills`. Every target receives the same reasoning contract, while
host-specific metadata stays with its host. Installation does not create or edit
`AGENTS.md`, application documentation, or agent-owned configuration.

Then ask the agent naturally:

```text
Use Relic to roast this feature before we implement it.
```

Ambient skill discovery may invoke Relic without naming it. The explicit form
above is the portable fallback across supported agents.

## CLI

| Command | Purpose |
|---|---|
| `relic init [--dir path]` | Create the root `relic.yaml` topology |
| `relic install [--engine claude\|copilot\|codex\|agents]` | Install or refresh the central skill |
| `relic search <query...> [--json]` | Search the complete current Relic corpus |
| `relic serve [--port number]` | Open the read-only interactive knowledge viewer |

Without `--engine`, `install` refreshes the supported project-local engine roots
that already exist.

## Also available via uv / pip

```bash
uv tool install relic-cli
pip install relic-cli
```

[Full documentation](https://github.com/filfp/relic) ·
[Report an issue](https://github.com/filfp/relic/issues)
