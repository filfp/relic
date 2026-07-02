# SnippetIncludeContract

**Type:** contract
**Inferred from:** spec 010-prompt-snippet-injection
**Confidence:** high

## Description

The LLM-runtime directive contract for composable prompt fragments. Governs both directive syntaxes (`<!-- include: -->` and `<!-- use: -->`), resolution rules, error behaviour, and the canonical snippet registry.

## Directive Syntaxes

### Snippet inclusion

```markdown
<!-- include: relic snippet <name> -->
```

- `<name>` is the snippet's registered identifier — the filename without `.md` (e.g. `preamble-guard`, `constitution-load`).
- Must appear on its own line (no surrounding content on that line).
- **Not resolved at build time** — the directive travels verbatim in the baked template and in `.claude/commands/` files.
- When the LLM encounters this directive, it calls `relic snippet <name>`, reads the output, and applies the content as context for the current session.
- Invisible when rendered in GitHub Markdown previews (HTML comment).

### Skill invocation

```markdown
<!-- use: relic.<skill-name> -->
```

- Tells the LLM to invoke the slash command `/relic.<skill-name>` at that point in the workflow.
- Machine-readable equivalent of prose instructions like "Run `/relic.search-context` before proceeding."
- Must appear on its own line.
- Invisible when rendered in GitHub Markdown previews.

## Resolution Rules (LLM runtime)

1. The LLM processes templates line by line as it executes a workflow command.
2. Any line matching `<!-- include: relic snippet <name> -->` triggers a call to `relic snippet <name>`. The LLM reads the output and incorporates it as context.
3. Any line matching `<!-- use: relic.<skill-name> -->` triggers invocation of `/relic.<skill-name>`.
4. Snippet content may itself contain `<!-- include: relic snippet <name> -->` directives — the LLM resolves these depth-first (composition).
5. Circular references (snippet A includes snippet B includes snippet A) are detected by `relic snippet` when it expands nested includes, which reports an error chain.

## Snippet Composition

Snippets may include other snippets, enabling complex reusable blocks built from simpler primitives:

```markdown
<!-- include: relic snippet preamble-guard -->
<!-- include: relic snippet constitution-load -->
```

No variable substitution (`{{PLACEHOLDER}}`-style tokens) is supported. Composition via inclusion is the only form of snippet reuse.

## CLI Command

`relic snippet <name>` outputs the content of a named snippet from the baked `SNIPPETS` registry (embedded in the CLI binary). The LLM calls this at runtime; developers use it for inspection.

- Unknown name → non-zero exit with error message
- Nested includes are expanded in the output (depth-first)
- Circular reference → non-zero exit reporting the cycle chain

## Error Behaviour

| Condition | Outcome |
|---|---|
| Unknown snippet name | Non-zero exit; message: `[snippet] Unknown snippet: <name>` |
| Circular include detected | Non-zero exit; message: `[snippet] Circular include: <chain>` |
| Malformed directive (unrecognised content) | Treated as plain text — no substitution, no error |

## Canonical Snippet Registry

Exact set determined by consolidation audit during plan phase. Current candidates:

| File | Content | Used in |
|---|---|---|
| `preamble-guard.md` | Preamble blockquote — universal version (consolidates standard + extended) | all templates |
| `constitution-load.md` | "Read `.relic/constitution.md`" instruction | specify, clarify, plan, tasks, implement |
| `html-inline-reader.md` | Source block population instructions | specify, clarify, plan, tasks, implement |
| `html-anti-transcription-common.md` | 3 universal anti-transcription rules | specify, clarify, plan, tasks, implement |

Note: `preamble-guard-extended.md` (fix.md only) is a consolidation candidate — the plan phase audit will determine whether the universal `preamble-guard.md` can cover all cases, eliminating the separate extended version.

Note: `search-cascade.md` was removed from this registry. The artifact search cascade is a **skill** (`templates/skills/search-context.md` → `/relic.search-context`), referenced via `<!-- use: relic.search-context -->`.

## What Snippets Are NOT

- Snippets are not engine output files — they are not written to `.claude/commands/` or similar.
- Snippets are not added as standalone entries in `ENGINE_TEMPLATES`.
- Snippets do not support variable substitution — composition via `<!-- include: -->` only.
- Snippets are not scaffold templates — `scripts/embed-templates.ts` is out of scope.
- Directives are not resolved at build time by `embed-engine-templates.ts` — they are LLM-runtime instructions.

## Owned by

010-prompt-snippet-injection
