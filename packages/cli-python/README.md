# relic-cli

> Shared project knowledge for coding agents — Python / uv distribution.

Relic keeps the current boundary of a project's knowledge in the repository.
One central skill helps coding agents challenge ideas, explore the code, and
persist only the requirements, decisions, epics, shared knowledge, and
specifications the developer chooses to keep.

This package ships a pre-compiled native binary. The command does not require
Node.js or a Python runtime after installation.

## Install

```bash
uv tool install relic-cli
```

Or with pip:

```bash
pip install relic-cli
```

## Getting started

```bash
cd my-project
relic init
relic install --engine codex
```

Supported engines are `claude`, `copilot`, and `codex`. Installation copies the
same Relic skill into that engine's project-local native skill directory. It
does not create or edit `AGENTS.md`, application documentation, or agent-owned
configuration.

Then ask the agent naturally:

```text
Use Relic to roast this feature before we implement it.
```

Ambient skill discovery may invoke Relic without naming it. The explicit form
above is the portable fallback across supported agents.

## CLI

| Command | Purpose |
|---|---|
| `relic init [--dir path]` | Create the minimal `.relic/` knowledge foundation |
| `relic install [--engine claude\|copilot\|codex]` | Install or refresh the central skill |
| `relic search <query...> [--json]` | Search the complete current Relic corpus |
| `relic serve [--port number]` | Open the read-only interactive knowledge viewer |

Without `--engine`, `install` refreshes the supported project-local engine roots
that already exist.

## Platform support

| Platform | Architecture |
|---|---|
| Linux | x86_64, arm64 |
| macOS | x86_64 (Intel), arm64 (Apple Silicon) |
| Windows | x86_64 |

## Also available via npm

```bash
npm install -g relic-cli
npx relic-cli init
```

[Full documentation](https://github.com/filfp/relic) ·
[Report an issue](https://github.com/filfp/relic/issues)
