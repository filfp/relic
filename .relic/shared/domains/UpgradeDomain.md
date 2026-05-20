# UpgradeDomain

**Type:** domain
**Owned by:** 004-cli-self-upgrade
**Confidence:** high

## Description

The self-upgrade lifecycle for the Relic CLI. Covers install channel detection, version
checking, binary upgrade, and engine hook refresh — including the invariant that project
knowledge is never modified during an upgrade.

## Key Entities

- **`INSTALL_CHANNEL`** — build-time constant embedded via `bun build --define` in each
  distribution target's build script. Values: `"npm"` | `"pypi"` | `"dev"` (local builds).
  Determines which package manager to invoke and which registry to query.
  There is no `"pypi-uv"` / `"pypi-pip"` distinction — the same PyPI wheel is installed
  by either tool; the upgrade command tries `uv` first and falls back to `pip` at runtime.

- **Binary upgrade** — invokes the appropriate package manager as a child process:
  - `npm`: `npm install -g relic-cli@<latest>`
  - `pypi`: `uv tool upgrade relic-cli` (fallback: `pip install --upgrade relic-cli`)

- **Engine hook refresh** — re-writes AI agent hook files using the new binary's embedded
  templates. Engines are read from `.relic/config.json` (see below) via `readEngines()`. Reuses `@relic/engines`
  write logic exactly as `relic add-engine` does.

- **`.relic/config.json`** — a committed JSON object recording project configuration,
  including which engines were registered via `relic init --engine` or `relic add-engine`.
  Written/updated by both commands. Shape: `{ "engines": ["claude", "copilot"], "mode": "md" }`.
  - `engines`: array of engine name strings, no duplicates — replaces the former `engines.json` array.
  - `mode`: scaffold output mode — `"md"` (default) or `"html"`. See `ProjectConfigDomain.md`.
  Access functions: `readEngines(relicDir)`, `writeEngines(relicDir, engines)`, `readMode(relicDir)`.
  Implemented in `packages/utility/src/project-config.ts` (replaces `engines-registry.ts`).
  Auto-migration: if `.relic/engines.json` exists and `.relic/config.json` does not, any read
  silently migrates — reads the array, writes `config.json`, removes `engines.json`.
  Must not be confused with personal session state — it is committed so the whole team knows
  which engines and mode are configured.
  Absent in projects predating spec 008 (or projects that have not yet run `relic init`) — upgrade warns and skips hook refresh.

- **Version check** — fetches the channel-specific registry endpoint for the latest version:
  - `npm`: `https://registry.npmjs.org/relic-cli/latest` → `.version`
  - `pypi`: `https://pypi.org/pypi/relic-cli/json` → `.info.version`
  Using the wrong endpoint risks a false "up to date" when channels are at different versions.

## Protected Files (MUST NOT be modified by upgrade)

The following are immutable from the upgrade command's perspective:

| Path | Reason |
|---|---|
| `.relic/shared/` | The brain — owned by project, not by Relic |
| `.relic/specs/` | Spec documents — project work, not Relic infrastructure |
| `.relic/fixes/` | Fix audit trail — project work |
| `.relic/changelog.md` | Append-only project audit trail |
| `.relic/constitution.md` | Project governance — user-authored |
| `.relic/session.json` | Personal session state — gitignored |

## Refreshable Files (safe to overwrite)

| Path | Reason |
|---|---|
| `.relic/preamble.md` | Relic-owned architectural invariants; may change between versions |
| `.claude/commands/relic.*.md` | Engine hooks — versioned with the binary |
| `.github/copilot-instructions.md` | Engine hooks — versioned with the binary |
| `.codex/instructions.md` | Engine hooks — versioned with the binary |
| `.claude/settings.json` | Permission config — idempotent merge, never destructive |
| `.codex/config.toml` | Permission config — idempotent merge (string check), never destructive |

## Engine Registry

`.relic/config.json` is the source of truth for which engines are active in a project.

| Rule | Detail |
|---|---|
| Written by | `relic init --engine <name>` and `relic add-engine <name>` |
| Format | `{ "engines": ["claude", "copilot"], "mode": "md" }` |
| Committed | Yes — team-shared state, not gitignored |
| Idempotent | Adding the same engine twice must not produce duplicates |
| Missing | Upgrade warns and skips hook refresh; `--check` and binary upgrade unaffected |
| Migration | If only `engines.json` exists, it is auto-migrated to `config.json` on first read |

## Upgrade Flags

| Flag | Behaviour |
|---|---|
| _(none)_ | Check version; upgrade binary if behind; refresh engine hooks + preamble |
| `--check` | Check version only; report whether update is available; no writes |
| `--prompts` | Refresh engine hooks + preamble only; no binary upgrade or version check |
| `--text` | Human-readable output instead of JSON |
