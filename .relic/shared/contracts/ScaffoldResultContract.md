# ScaffoldResultContract

**Type:** contract
**Inferred from:** packages/core/src/commands/scaffold.ts
**Confidence:** medium

## Description
The JSON output of `relic scaffold`. Used by AI workflow commands to learn the newly created or resolved spec ID, path, and which files were created.

## Shape
```json
{
  "spec_id": "001-auth",
  "spec_dir": "<absolute path>",
  "title": "Auth",
  "date": "2026-04-12",
  "was_new": true,
  "current_spec_updated": true,
  "files_created": ["spec.md", "plan.md", "tasks.md", "artifacts.json"]
}
```

## Consumers
- `/relic.specify` and `/relic.clarify` AI workflows — call `relic scaffold` to ensure the spec folder exists before writing
- Any AI command that needs to create a new spec and immediately get its ID

## Shape (extended by 008-html-spec-mode)

When the project `config.json` has `mode = "html"`, `files_created` additionally includes `"<spec-id>.html"` — the file is named by the spec ID, not generically, to prevent tab name collisions when multiple spec HTML files are open simultaneously:

```json
{
  "spec_id": "008-html-spec-mode",
  "spec_dir": "<absolute path>",
  "title": "HTML Spec Mode",
  "date": "2026-05-19",
  "was_new": true,
  "current_spec_updated": true,
  "files_created": ["spec.md", "plan.md", "tasks.md", "artifacts.json", "008-html-spec-mode.html"]
}
```

`"<spec-id>.html"` is always the last entry in `files_created` when present. The filename is always the spec ID with `.html` extension — never a generic `"spec.html"`. When `mode = "md"` (default), `files_created` is unchanged.

## Owned by
008-html-spec-mode
