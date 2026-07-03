<!-- include: relic snippet context-mode-check -->

If `mode = "md"`, skip the rest of this step entirely.

If `mode = "html"`:

The spec's HTML file (`<spec-id>.html`, created by `relic scaffold`) is a **fragment**:
one `<relic-body>` root containing semantic tags only — no doctype, no scripts, no
styles, no chrome. It is rendered by the embedded viewer (`relic serve`); never write
page infrastructure into it.

<!-- include: relic snippet viewer-components -->

1. Read the current fragment.
2. Update it to reflect this session's work — **synthesis, not transcription**:
   - Keep the derived tags (`<relic-spec-meta/>`, `<relic-tasks/>`, `<relic-artifacts/>`,
     `<relic-changelog/>`) in place and NEVER author the data they render — the server
     computes it live from the real files.
   - Author only what needs synthesis: narrative sections, decision callouts, flow
     diagrams of architectures and pipelines, comparison tables.
   - If a section would just restate what a derived tag or the Markdown files already
     show, delete it instead of writing it.
3. Write the fragment back. Run `relic validate` if unsure — it lints fragments
   (unknown tags, malformed attributes) and a typo degrades to an inline warning in
   the viewer, never a broken page.

To show the result: the viewer serves it at `http://localhost:<port>/spec/<spec-id>`
(`relic serve`, or the `view_spec` MCP tool).
