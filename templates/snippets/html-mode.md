<!-- include: relic snippet context-mode-check -->

If `mode = "md"`, skip the rest of this step entirely.

If `mode = "html"`:

1. Read `.relic/base.html` — open the `<template id="relic-docs">` element for the component inventory.
2. Read `<spec-id>.html` in the spec directory.
3. Update it with **synthesised** content reflecting the changes made in this session.

   **Choose synthesis depth based on what changed:**
   - **Deep pass** — for structural changes (new spec written, plan rewritten, requirements added or changed, task list generated, a major implementation milestone reached). Re-render the affected sections from scratch using components that match the new content.
   - **Light pass** — for incremental updates (a single task checked off, one open question resolved, a single decision recorded). Touch only the affected component(s); leave the rest as-is.

   **Anti-transcription rules (always apply):**
   - Do NOT copy Markdown text verbatim into the HTML.
   - If a section would look identical to the Markdown source, you are doing it wrong.
   - Choose `<relic-*>` components that fit what changed:
     - `<relic-progress>` / `<relic-status>` — completion ratios and lifecycle state
     - `<relic-table>` — lists of items, before/after diffs, file changes
     - `<relic-callout type="info|warn|success">` — decisions, deviations, milestones
     - `<relic-chip>` — inline metadata, counts, badges
   - Use `var(--text)`, `var(--surface)`, `var(--border)` for any custom CSS so dark mode works.

4. Keep the inline reader source blocks current. The CLI embeds spec.md/plan.md/tasks.md into
   the three `relic-src-*` blocks automatically on every `relic scaffold` / `relic html-sync` run —
   you only need to act if you edited a Markdown file **after** the scaffold step of this session:
   - Replace the content of `<script type="text/plain" id="relic-src-spec">` with the full text of `spec.md`.
   - Replace the content of `<script type="text/plain" id="relic-src-plan">` with the full text of `plan.md` (empty string if not yet created).
   - Replace the content of `<script type="text/plain" id="relic-src-tasks">` with the full text of `tasks.md` (empty string if not yet created).

   **Escaping rule:** if any embedded markdown contains a closing script tag (the character `<`
   immediately followed by `/script`), write it as `<\/script` inside the source block — otherwise
   it terminates the block and breaks the whole page. The reader converts it back.

5. Write the updated `<spec-id>.html` back. **Edit only the content regions** — the areas between
   `<!-- relic:content:start -->` / `<!-- relic:content:end -->` and
   `<!-- relic:sources:start -->` / `<!-- relic:sources:end -->`. Everything else (styles, component
   script, header, reader script) is machine-managed chrome kept current by `relic scaffold` /
   `relic html-sync` — never modify, reformat, or regenerate it.
