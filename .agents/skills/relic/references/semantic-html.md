# Semantic Relic HTML

Read this reference when authoring or reviewing a specification's canonical
`index.html`, or when embedding HTML in a canonical Markdown record.

## Contents

- Canonical Fragment — the `relic-body` root and the enhancement elements
- Embedded Markdown HTML — when a canonical record may reach for HTML
- Presentation Boundary — what the frontend owns and what must never appear

## Canonical Fragment

Author an HTML fragment with one required root. Its `id` is the specification identity
and should match the folder name:

```html
<relic-body id="012-spec-viewer">
  <!-- free specification content -->
</relic-body>
```

No fixed title, status, section order, or document anatomy is required. Optional
project-defined metadata may use `data-*` attributes and remains opaque to Relic.

Use standard semantic HTML first: sections, headings, paragraphs, tables, lists, links,
figures, captions, details, definitions, blockquotes, images with alternative text,
code, and native progress elements.

Use Relic elements only for progressive enhancement:

- `<relic-callout>` highlights a semantic note, risk, warning, or project-defined
  concern;
- `<relic-flow>` enhances readable textual flow notation;
- `<relic-chart>` enhances a child semantic table or list;
- `<relic-chip>` presents a short neutral marker without imposing a lifecycle.

All knowledge must remain readable and indexable in child text and ordinary links. Keep
chart values in a semantic table or list and flow source as text. A visual relationship
becomes a knowledge-web edge only through an ordinary link.

## Embedded Markdown HTML

A Markdown record stays Markdown. Reach for HTML only where Markdown has no equivalent,
most often a `<details>` disclosure that keeps a long flow readable:

```markdown
<details>
<summary><strong>Approval</strong> — admin clears a pending user</summary>

1. A user registers and their account starts unapproved.
2. An admin marks the account as approved.

</details>
```

The same standard vocabulary, attribute rules, and URL rules apply. The `relic-*`
components do not; they belong to specification HTML. Keep a blank line around embedded
Markdown so it is still read as Markdown, and balance every tag you open. An anchor
authored in HTML is an ordinary relative link, so it carries the same edges, backlinks,
and broken-link evidence as its Markdown equivalent.

## Presentation Boundary

The frontend owns styling, layout, color, navigation, diagnostics, backlinks, and
interaction. Do not add document chrome, generated metadata panels, task or changelog
components, scripts, styles, event handlers, iframes, inline SVG, canvas, executable
URLs, or JSON-only knowledge attributes.

Unknown callout kinds and other project vocabulary are allowed. Unknown or malformed
Relic components must preserve readable child content rather than define new required
behavior. HTML is the only specification mode; do not create a Markdown twin or a
synchronization lifecycle.
