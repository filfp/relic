# SpecFilesAllowlistRule

**Type:** rule
**Inferred from:** packages/core/src/commands/validate.ts
**Confidence:** high

## Description
Only four files are permitted in a spec directory: `spec.md`, `plan.md`, `tasks.md`, and `artifacts.json` — plus `<spec-id>.html` when the project runs in html mode (`config.json` `mode = "html"`). Any other file is flagged as an illegal file by `relic validate`.

## Enforcement
- `runValidate()` reads each spec directory and checks every file against `ALLOWED_SPEC_FILES = {"spec.md", "plan.md", "tasks.md", "artifacts.json"}`
- When `mode = "html"`, the file named exactly `<spec-id>.html` is additionally allowed
- Illegal files are reported as validation failures

## Exceptions
- `<spec-id>.html` in html mode only. It is created by `relic scaffold` as a `<relic-body>` fragment and rendered by the embedded viewer (`relic serve`) — it carries no chrome, and `relic validate` lints it. The filename must match the spec ID exactly — a generic `spec.html` or any other `.html` name remains illegal.
- No other exceptions — this is a hard constraint to keep spec directories clean and predictable

## Owned by
(unowned — assign when a spec takes responsibility)
