# ContextResultContract

**Type:** contract
**Inferred from:** packages/core/src/commands/context.ts
**Confidence:** high

## Description
The JSON output of `relic context`. Used by AI agents to determine which spec is active, which files exist, and which shared artifacts are referenced — before executing any workflow command.

## Shape
```json
{
  "relic_dir": "<absolute path>",
  "spec_id": "001-auth",
  "active_spec_source": "arg|env|session|git-branch",
  "spec_dir": "<absolute path>",
  "current_fix": "2026-04-13-null-session-crash",
  "mode": "md",
  "sdd": "auto",
  "viewer": { "running": false, "port": 4747, "url": null },
  "external": { "configured": false },
  "external_reads": [],
  "files": {
    "preamble": true,
    "constitution": true,
    "spec": true,
    "plan": false,
    "tasks": false,
    "artifacts_json": true,
    "changelog": true
  },
  "shared_artifacts": [
    { "path": "shared/domains/UserAuth.md", "role": "owns|reads", "exists": true }
  ]
}
```

`current_fix` is `null` when no fix is active; the fix ID string when `session.fix` is set
in `.relic/session.json`. `active_spec_source` reports `session` when the spec was resolved
from `session.json`. `mode` is `"md"` or `"html"` read from `.relic/config.json` (defaults
to `"md"` if config is absent). AI commands use these fields to detect fix/spec context,
switch behaviour accordingly, and determine whether the HTML step is active.

### `sdd` (added by 011-claude-plugin)

Additive field (changelog: 2026-07-02). `"auto"` or `"suggest"` — the ambient-SDD
autonomy knob read from `config.json` (`"auto"` when absent). Ambient skills and
workflow prompts consult it before structural actions (new specs, ownership or
contract changes): `auto` = announce-then-do, `suggest` = ask first. See
`ClaudePluginContract.md` (owned by 011).

### `viewer` (added by 012-spec-viewer)

Additive field (changelog: 2026-07-03). `{ running, port, url }` — the spec viewer
state: `port` is the configured port (`config.json` `viewer.port`, default 4747);
`running`/`url` reflect a 300ms identity-checked health probe. Lets agents link to
views without an MCP round-trip. See `ViewerContract.md` (owned by 012).

### `external` / `external_reads` (added by 009-external-spec-integration)

Additive fields — no pre-existing field changed shape (changelog: 2026-07-02, OQ-1 of spec 009).
Authoritative shapes live in `ExternalConfigContract.md` §3 (owned by 009); summary:

- `external` — `{ "configured": false }` when `config.external` is absent or empty; otherwise
  `{ "configured": true, "types": { "<type>": { "path", "resolved_path", "exists" } } }` for
  each configured type key (`fr`, `nfr`, `br`, `adr`, `us`, `epic`).
- `external_reads` — one entry per `external_reads` item in the active spec's `artifacts.json`:
  `{ "entry", "type", "filename", "resolved_path", "exists" }`, plus an `"error"` field when the
  entry cannot be resolved (unconfigured type, malformed entry, path traversal). AI workflow
  commands must hard-stop when any entry has `exists: false` or an `error` (see the
  `external-reads` prompt snippet).

## Consumers
- All AI workflow commands (`/relic.specify`, `/relic.plan`, `/relic.fix`, etc.) — call `relic context` first to orient themselves
- `relic validate` — uses context to locate the spec
- `/relic.clarify` and `/relic.analyse` — check `current_fix` to determine which context to operate in

## Owned by
003-fix-solve-workflow
