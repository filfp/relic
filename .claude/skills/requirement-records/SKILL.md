---
name: requirement-records
description: Create consistently formatted and automatically numbered FR, NFR, ADR, and EPIC Markdown records in this repository. Use when Codex needs to add a functional requirement, non-functional requirement, architecture decision record, or implementation epic, especially when an indexed standalone document is needed.
---

# Requirement Records

Use this skill to create one focused record at a time. Treat existing architecture, gameplay, epics, and ADRs as the source of truth; do not use the generator to introduce an unapproved design decision.

## Workflow

1. Read the source documents and obtain approval for material decisions before generating a record.
2. Write the semantic content in a JSON input file or pass it through standard input.
3. Run `scripts/create_record.py TYPE --input INPUT.json` from the repository root, where `TYPE` is `FR`, `NFR`, `ADR`, or `EPIC`.
4. Inspect the generated Markdown, update the documentation index when needed, and run `git diff --check`.

The script assigns the next global number for its type by scanning `docs/`. Never manually choose or reuse a number. Use `--dry-run` to inspect the destination before writing.

## Input Contracts

All input is JSON. `title` is required for every record. `status` is optional and defaults to `draft`; allowed values are `draft`, `accepted`, `implemented`, `verified`, `deferred`, and `superseded`.

Generated records begin with YAML front matter. FRs and NFRs include `id`, `title`, `status`, and `origin`; ADRs and epics include `id`, `title`, and `status`. Do not add a duplicate Markdown metadata table.

`FR` and `NFR` require:

```json
{
  "title": "Idempotent movement command",
  "epic": "EPIC-001",
  "statement": "The server shall ...",
  "acceptance_criteria": ["..."],
  "architecture_references": ["docs/architecture/events.md"],
  "dependencies": []
}
```

`ADR` requires `context`, `decision`, and `consequences`. It may include `architecture_references` and `dependencies`.

`EPIC` requires `objective`, `scope`, and `acceptance_criteria`. It may include `architecture_references` and `dependencies`.

## Output Locations

- `FR` → `docs/requirements/functional/<epic-slug>/`
- `NFR` → `docs/requirements/non-functional/<epic-slug>/`
- `ADR` → `docs/decisions/`
- `EPIC` → `docs/epics/`

The generated record is a starting point, not proof that the requirement is correct. Keep requirements atomic and testable. For an incompatible change to an implemented requirement, create a new record and mark the old one `superseded`; do not rewrite its historical intent.
