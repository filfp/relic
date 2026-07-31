# Relic knowledge viewer

Read-only React frontend for the Relic 2.0 knowledge web.

The viewer consumes the API exposed by `relic serve`. It renders the canonical
document catalog, Markdown records, typed specification HTML, relationships,
search results, artifacts, and maintenance diagnostics. Presentation belongs
here rather than in project-authored HTML.

```bash
bun run dev
bun run build
bun run lint
```

The distribution build embeds the Vite output into the CLI through
`scripts/embed-viewer.ts`.
