**Fragment tag reference** (full docs at the viewer's `/docs` route):

Derived — self-closing, server-computed, never author their data:
`<relic-spec-meta/>` `<relic-tasks/>` `<relic-artifacts/>` `<relic-changelog/>`

Authored — synthesis only:
- `<relic-section title="...">…</relic-section>` — card container
- `<relic-callout type="info|warn|risk|success">…</relic-callout>`
- `<relic-flow>graph LR\nA[x] --> B{y?}</relic-flow>` — mermaid-style diagram
- `<relic-chart type="bar|pie|line" labels='["A"]' data='[1]' title="..."/>`
- `<relic-table headers='["A","B"]' rows='[["1","2"]]'/>` — JSON attrs, plain-text cells
- `<relic-chip color="blue|green|amber|red|purple">…</relic-chip>`
- `<relic-status value="pending|in-progress|done|risk|draft">…</relic-status>`
- Plain prose inside sections: `p, ul, ol, li, code, pre, strong, em, h1–h4, blockquote, div, span`

Rules: JSON attributes use single-quoted attribute values wrapping double-quoted JSON.
Unknown tags and malformed attributes render as inline warnings — run `relic validate`
to catch them early.
