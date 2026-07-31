# relic-cli

> Shared project knowledge for coding agents — Python / uv distribution.

Relic keeps the current boundary of a project's knowledge in the repository.
One central skill helps coding agents challenge ideas, explore the code, and
persist only the requirements, decisions, epics, shared knowledge, and
specifications the developer chooses to keep.

This package ships a pre-compiled native binary. Its small Python launcher
requires Python, but the Relic runtime itself does not require Node.js or Bun.

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

## Platform support

| Platform | Architecture |
|---|---|
| Linux glibc 2.17+ | x86_64 (SSE4.2 baseline), arm64 |
| macOS 13+ | x86_64 (Intel), arm64 (Apple Silicon) |
| Windows | x86_64 (SSE4.2 baseline) |

## Also available via npm

```bash
npm install -g relic-cli
npx relic-cli init
```

[Full documentation](https://github.com/filfp/relic) ·
[Report an issue](https://github.com/filfp/relic/issues)
