---
id: NFR-002
---

# Safe and tolerant consultability

Malformed or ambiguous knowledge must remain visible by path with focused diagnostics
whenever safe reading is possible. A broken link, duplicate ID, unsupported component,
or missing optional corpus directory must not hide unrelated knowledge or become a
separate validation workflow.

Filesystem discovery and artifact delivery must prevent repository and symbolic-link
escapes. Canonical HTML must be converted to a bounded semantic AST, whether it is a
specification document or HTML embedded in canonical Markdown; executable content, event
handlers, inline presentation, embedded documents, unsafe URLs, and remote media must
never execute in the viewer. Content nested inside a removed unsafe element must reach
neither the viewer nor the search index.

Only passive raster artifacts may render inline. HTML, SVG, Markdown, text, PDFs, and
other artifacts must be served as downloads with restrictive content type, disposition,
content security, referrer, and sniffing headers.

The frontend must preserve readable child content for unknown project vocabulary and
present diagnostics according to their actual severity without assigning authority or a
status lifecycle.

Federated consultation must validate every member independently and preserve every safe
valid project when another member fails. Invalid member entries, duplicate member
realpaths, repeated traversal, unsafe authorities, and unavailable member corpora produce
project-address-qualified diagnostics. Reached realpaths are normalized once across the
whole federation tree; intentional content overlap across independent project topologies
is not an ownership error. A failing member edge hides only the subtree reachable solely
through that edge. Artifact delivery accepts only a validated hierarchical project
address and a discovered project-relative artifact path, so caller input cannot select
an arbitrary filesystem root.

No project can declare itself as a federation member. Absolute member paths, project
boundary escapes, unknown address segments, repeated realpaths, descendant-to-ancestor
escapes, and unsafe cross-branch artifact requests fail locally. Ancestor-to-descendant
links may resolve only when their ordinary relative targets belong to knowledge in the
validated reachable subtree.

The composed read model reports a member boundary escape as a project-address-qualified
warning while preserving every readable project. Search, serve, and verify expose that
same evidence. It does not reinterpret an unsafe protocol, malformed URL encoding, or
root-authored link as an outbound federation link.

See the [knowledge model](../../../shared/SHARED-knowledge-model.md),
[read-only access](../functional/FR-002-read-only-knowledge-access.md),
[shared safe HTML vocabulary](../../decisions/ADR-003-shared-safe-html-vocabulary.md),
and the [federation specification](../../../specs/002-relic-federation/index.html).
