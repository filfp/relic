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
- `<spec-id>.html` in html mode only. It is CLI-managed: created by `relic scaffold`, chrome re-based and reader sources embedded by `relic html-sync`. The filename must match the spec ID exactly — a generic `spec.html` or any other `.html` name remains illegal.
- No other exceptions — this is a hard constraint to keep spec directories clean and predictable

## Owned by
(unowned — assign when a spec takes responsibility)
