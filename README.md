# Relic

> Shared project knowledge for coding agents.

Relic keeps the current boundary of a project's knowledge in the repository so
different developers and coding agents can work from the same context. Its
specification-driven workflow is intentionally lightweight: one central skill
challenges ideas, explores code, and persists only the knowledge the developer
chooses to retain.

Relic does not impose a `specify → clarify → plan → tasks` pipeline, own
`AGENTS.md`, select an agent's search tools, or maintain hidden workflow state.
Code is the authority for implemented behavior; Relic records explain the
current requirements, decisions, boundaries, and intent around it.

## Install

Using npm with Node.js 18 or newer:

```bash
npm install -g relic-cli
```

Or install a native binary through Python tooling:

```bash
uv tool install relic-cli
# or
pip install relic-cli
```

## Start a project

```bash
cd my-project
relic init
relic install --engine codex
```

Supported engines are `claude`, `copilot`, and `codex`. Installation copies the
same central Relic skill into the selected engine's project-local native skill
directory. It does not edit project instructions or application documentation.

Then work with the agent naturally:

```text
Use Relic to roast this feature before we implement it.
```

Explicitly naming Relic is the portable fallback when an agent does not invoke
the skill ambiently.

## Knowledge model

`.relic/RELIC.md` is the stable entry point and the sole topology authority.
The default project starts with:

```text
.relic/
  RELIC.md
  specs/
  shared/
```

The topology may point functional requirements, non-functional requirements,
architecture decisions, and epics anywhere in the repository. Shared knowledge
and typed records are Markdown. Every canonical specification is one typed HTML
document; other files in its folder are searchable artifacts rather than
canonical knowledge.

Documents form a web through ordinary repository-relative links. They are
living records: update the current document when the project's present
knowledge changes and use Git when historical recovery is needed.

## CLI

| Command | Purpose |
|---|---|
| `relic init [--dir path]` | Create the minimal `.relic/` foundation |
| `relic install [--engine claude\|copilot\|codex]` | Install or refresh the central skill |
| `relic search <query...> [--json]` | Search the complete current corpus |
| `relic serve [--port number]` | Serve the read-only interactive knowledge viewer |

Without `--engine`, `install` refreshes supported project-local engine roots
that already exist.

## Development

Relic uses Bun with hoisted workspace dependencies.

```bash
bun install --frozen-lockfile
bun run build:assets
bun run typecheck
bun run test
bun run test:distribution
```

The product architecture and accepted migration decisions live in
[docs/relic-2.0.md](docs/relic-2.0.md) and
[docs/relic-2.0-work-order.md](docs/relic-2.0-work-order.md).

## Distribution

| Channel | Package |
|---|---|
| npm | `relic-cli` |
| PyPI / uv | `relic-cli` |

[Repository](https://github.com/filfp/relic) ·
[Report an issue](https://github.com/filfp/relic/issues)
