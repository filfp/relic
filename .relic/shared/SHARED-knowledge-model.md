---
id: SHARED-knowledge-model
---

# Relic knowledge model

The root relic.yaml is the single topology authority. It contains only the
specification, shared, FR, NFR, ADR, and EPIC roots. It is configuration, not a
canonical document. No engine registry, ID counter, manifest, session file, or hidden
state participates in knowledge discovery.

Canonical nodes are:

- one semantic index.html inside each numbered specification folder;
- Markdown documents recursively found under declared shared and record roots.

Only id is required metadata for native knowledge. Other metadata is optional and
opaque. Status values have no Relic-defined lifecycle. Identities compare
case-insensitively, while paths remain the navigation authority. Duplicate identities
stay visible as focused diagnostics and may be reconciled only with developer approval.

Every other regular file inside a specification folder is an artifact. Supported text
artifacts participate in full-text search with their specification as context, but they
do not become canonical nodes, graph inputs, or independently rendered knowledge.
Binary artifacts remain downloadable from their specification.

Ordinary relative links form a peer-to-peer web. Links convey navigation, not ownership
or hierarchy. The read model derives backlinks and related documents without writing a
reverse index. Missing paths, unsafe content, duplicates, and unsupported markup produce
localized diagnostics while unrelated knowledge remains readable.

Topology roots may live in `.relic/`, `docs/`, a repository-contained submodule, or any
other project-chosen location. The project that contains the code owns relic.yaml and
declares how it consumes the corpus; a storage repository needs no Relic configuration
of its own.

The frontend and CLI consume the same exhaustive read model. Search is supplementary:
agents remain free to use filesystem traversal, grep, ripgrep, symbol search, and other
native exploration.

See the [topology and link decision](../records/decisions/ADR-002-topology-and-relative-links.md),
the [read-only access requirement](../records/requirements/functional/FR-002-read-only-knowledge-access.md),
and the [consultability requirement](../records/requirements/non-functional/NFR-002-safe-consultability.md).
