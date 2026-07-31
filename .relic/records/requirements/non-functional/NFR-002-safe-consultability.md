---
id: NFR-002
---

# Safe and tolerant consultability

Malformed or ambiguous knowledge must remain visible by path with focused diagnostics
whenever safe reading is possible. A broken link, duplicate ID, unsupported component,
or missing optional corpus directory must not hide unrelated knowledge or become a
separate validation workflow.

Filesystem discovery and artifact delivery must prevent repository and symbolic-link
escapes. Canonical HTML must be converted to a bounded semantic AST; executable content,
event handlers, inline presentation, embedded documents, unsafe URLs, and remote media
must never execute in the viewer.

Only passive raster artifacts may render inline. HTML, SVG, Markdown, text, PDFs, and
other artifacts must be served as downloads with restrictive content type, disposition,
content security, referrer, and sniffing headers.

The frontend must preserve readable child content for unknown project vocabulary and
present diagnostics according to their actual severity without assigning authority or a
status lifecycle.

See the [knowledge model](../../../shared/SHARED-knowledge-model.md) and
[read-only access](../functional/FR-002-read-only-knowledge-access.md).
