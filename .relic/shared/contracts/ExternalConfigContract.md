# ExternalConfigContract

**Type:** contract
**Owned by:** 009-external-spec-integration
**Confidence:** high

## Description

JSON shape extensions introduced by the External Spec Integration feature. Covers the `external` block added to `config.json`, the `external_reads` array added to `artifacts.json`, the `external` field added to `relic context` output, and the output shapes of all `relic external` sub-commands.

---

## 1. `config.json` — `external` Block

`config.external` is a flat map from type key to directory path. Keys are a subset of the six supported types. Any key may be omitted — unconfigured types are unavailable.

```json
{
  "engines": ["claude"],
  "mode": "html",
  "external": {
    "fr": "./docs/functional-requirements",
    "nfr": "./docs/non-functional-requirements",
    "adr": "./docs/architecture-decisions",
    "us": "./docs/user-stories"
  }
}
```

| Key | Type | Description |
|---|---|---|
| `fr` | `string` | Directory for Functional Requirements. Absolute or relative to `.relic/` parent. |
| `nfr` | `string` | Directory for Non-Functional Requirements. |
| `br` | `string` | Directory for Business Requirements. |
| `adr` | `string` | Directory for Architecture Decision Records. |
| `us` | `string` | Directory for User Stories. |
| `epic` | `string` | Directory for Epics. |

If `external` is absent or empty, the feature is disabled — no error.

---

## 2. `artifacts.json` — `external_reads` Extension

```json
{
  "owns": ["shared/domains/PaymentDomain.md"],
  "reads": ["shared/rules/PricingRules.md"],
  "touches_files": ["src/payments/handler.ts"],
  "external_reads": [
    "fr/FR-001-checkout-flow.md",
    "adr/ADR-005-payment-provider.md"
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `external_reads` | `string[]` | Each entry is `"<type>/<filename>"`. `<type>` must be a configured key in `config.external`. `<filename>` is the file's name within that type's directory. Path traversal (`../`) is rejected as a hard error. |

Relic resolves `"fr/FR-001-checkout-flow.md"` to `config.external.fr + "/FR-001-checkout-flow.md"`.

If `external_reads` is absent, that spec has no external dependencies — no error.

**Missing paths are hard errors.** A missing file stops the dependent command — no degraded output.

---

## 3. `relic context` — `external` Field

```json
{
  "relic_dir": "...",
  "spec_id": "007-payments",
  "external": {
    "configured": true,
    "types": {
      "fr": {
        "path": "./docs/functional-requirements",
        "resolved_path": "/Users/dev/acme/docs/functional-requirements",
        "exists": true
      },
      "adr": {
        "path": "./docs/architecture-decisions",
        "resolved_path": "/Users/dev/acme/docs/architecture-decisions",
        "exists": true
      }
    }
  },
  "external_reads": [
    {
      "entry": "fr/FR-001-checkout-flow.md",
      "type": "fr",
      "filename": "FR-001-checkout-flow.md",
      "resolved_path": "/Users/dev/acme/docs/functional-requirements/FR-001-checkout-flow.md",
      "exists": true
    },
    {
      "entry": "adr/ADR-005-payment-provider.md",
      "type": "adr",
      "filename": "ADR-005-payment-provider.md",
      "resolved_path": "/Users/dev/acme/docs/architecture-decisions/ADR-005-payment-provider.md",
      "exists": false
    }
  ]
}
```

If `config.external` is absent or empty: `"external": { "configured": false }`.

---

## 4. `relic external` Sub-command Output Shapes

### `relic external` (no args) — per-type directory listing

```json
{
  "configured": true,
  "types": {
    "fr": {
      "path": "./docs/functional-requirements",
      "exists": true,
      "entries": [
        { "name": "FR-001-checkout-flow.md", "type": "file" },
        { "name": "FR-002-session-auth.md", "type": "file" }
      ]
    },
    "adr": {
      "path": "./docs/architecture-decisions",
      "exists": true,
      "entries": [
        { "name": "ADR-005-payment-provider.md", "type": "file" }
      ]
    }
  }
}
```

### `relic external init <remote-url>` — submodule setup

```json
{
  "success": true,
  "submodule_path": "specs/",
  "remote_url": "git@github.com:acme/specs.git",
  "note": "Per-type paths not configured. Run: relic external set <type> <path>"
}
```

Note: `relic external init` does NOT write to `config.external` — per-type paths are configured separately.

### `relic external set <type> <path>` — configure type directory

```json
{
  "success": true,
  "type": "fr",
  "previous_path": null,
  "new_path": "./docs/functional-requirements",
  "exists": true
}
```

### `relic external create <type> <title>` — create + commit document

```json
{
  "success": true,
  "type": "fr",
  "filename": "FR-004-session-expiry.md",
  "resolved_path": "/Users/dev/acme/docs/functional-requirements/FR-004-session-expiry.md",
  "external_reads_entry": "fr/FR-004-session-expiry.md",
  "linked_to_spec": "007-payments",
  "committed": true,
  "commit_sha": "a3f1b8c"
}
```

If the type directory is not inside a git repository, `committed` is `false` and a `"warning"` field is included.

### `relic external link <type>/<filename>` — link existing document

```json
{
  "success": true,
  "entry": "fr/FR-001-checkout-flow.md",
  "type": "fr",
  "filename": "FR-001-checkout-flow.md",
  "resolved_path": "/Users/dev/acme/docs/functional-requirements/FR-001-checkout-flow.md",
  "exists": true,
  "linked_to_spec": "007-payments"
}
```

Hard error if the file does not exist or the type is not configured.

### `relic external list [--spec <id>]` — all external_reads across specs

```json
{
  "entries": [
    {
      "spec": "007-payments",
      "entry": "fr/FR-001-checkout-flow.md",
      "type": "fr",
      "filename": "FR-001-checkout-flow.md",
      "resolved_path": "/Users/dev/acme/docs/functional-requirements/FR-001-checkout-flow.md",
      "exists": true
    },
    {
      "spec": "009-external-spec-integration",
      "entry": "adr/ADR-005-payment-provider.md",
      "type": "adr",
      "filename": "ADR-005-payment-provider.md",
      "resolved_path": "/Users/dev/acme/docs/architecture-decisions/ADR-005-payment-provider.md",
      "exists": false
    }
  ]
}
```

Entirely CLI-driven — requires no LLM, no active session. Works with no `current-spec` set.

---

## 5. `relic validate` — External Errors

Missing `external_reads` files are reported as **errors** under `external_errors` (not warnings):

```json
{
  "valid": false,
  "conflicts": [],
  "missing_owned": [],
  "external_errors": [
    {
      "spec": "007-payments",
      "entry": "adr/ADR-005-payment-provider.md",
      "resolved_path": "/Users/dev/acme/docs/architecture-decisions/ADR-005-payment-provider.md",
      "reason": "file not found — update external_reads or restore the file in the spec repo"
    }
  ]
}
```

---

## Invariants

- `config.external` entries are always stored as given (relative or absolute) — not normalised to absolute. Resolved at runtime.
- `external_reads` entries are always `"<type>/<filename>"` strings — never absolute paths.
- `<type>` in any `external_reads` entry must match a configured key in `config.external`. An unconfigured type is a hard error.
- Path traversal (`../`) in any `external_reads` entry is always rejected as a hard error.
- `relic external create` always includes `committed` in its output. If the type directory is not a git repo, `committed: false` with a warning.
- Missing `external_reads` paths are always hard errors — never warnings — in both `relic validate` and AI workflow commands.
- `relic external init` never writes to `config.external`. Per-type paths are configured separately via `relic external set`.
