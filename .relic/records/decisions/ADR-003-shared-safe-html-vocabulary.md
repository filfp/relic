---
id: ADR-003
---

# One safe HTML vocabulary across both canonical grammars

Relic has one allowlisted semantic HTML vocabulary. Canonical specification HTML and
HTML embedded in canonical Markdown are read through the same allowlist, the same
attribute rules, and the same URL safety rules. Markdown may use the standard subset;
the `relic-*` progressive-enhancement components remain specification-only, because
they are the reason a specification has its own canonical grammar.

Developers and agents author ordinary Git-host HTML inside records, most often a
`<details>` disclosure that keeps a long flow readable. Treating that markup as literal
text displayed the tags and hid the knowledge, which contradicts the requirement that
the frontend preserve readable child content. Passing it through the allowlist that
already exists costs no new safety surface.

Markdown emits raw HTML as unbalanced sibling tokens: an opening block, the Markdown it
contains, and a closing block. The read model pairs the end tags that surround each
token and nests the intervening Markdown inside the element, so authored structure
survives without a Markdown-specific grammar. Unsafe elements discard their nested
content, unsupported wrappers are removed while their content stays readable, and
unbalanced markup is localized diagnostic evidence rather than a corpus failure.

An anchor authored in HTML is an ordinary relative link and therefore an ordinary graph
edge with derived backlinks and broken-link evidence. This closes a gap where the same
navigation was invisible in Markdown and visible in specification HTML.

This is one document in one grammar with an embedded safe subset. It is not a second
canonical representation, a Markdown and HTML twin, an authoring mode selector, or
synchronization machinery between equivalent documents.

See the [knowledge model](../../shared/SHARED-knowledge-model.md) and
[safe consultability](../requirements/non-functional/NFR-002-safe-consultability.md).
