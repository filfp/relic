# Structured Search

Read this reference only when you must select or narrow documents across the corpus by
kind or by metadata and native exploration would be clumsy.

## Contents

- Use Search Only When It Pays — what it is good for, and why it is never required
- Filters — plain query, `--kind`, `--meta`, and the JSON form

## Use Search Only When It Pays

`relic search` selects documents across the whole read model: every record, shared
document, and specification, plus federated members. It is good for questions such as
"every ADR" or "records that carry an owner", which grep answers with false positives from
body text.

Native tools (grep, file reads, symbol search) are equally valid and often faster. Search
is never a gateway: do not run it to start a task or to confirm that a document exists.

## Filters

```
relic search [query...] [--kind <kind>] [--meta <filter>] [--json]
```

- A plain query matches text, identity, memberships, and serialized metadata.
- `--kind adr` keeps documents whose corpus membership is `adr`, `spec`, `shared`, or
  another declared kind. Repeating it requires all kinds, which rarely helps; run separate
  searches for several kinds.
- `--meta owner` keeps documents with that top-level key; `--meta owner=platform` keeps
  those whose scalar value, or a scalar inside a list, has that exact string form
  (`priority=3`, `draft=true`).
- `--meta '{"owner": null, "tags": ["auth", "api"]}'` is the same filters as one JSON
  object: a scalar becomes `key=value`, `null` becomes presence, each list item becomes
  its own `key=item`. Only arguments starting with `{` are read as JSON; malformed JSON is
  an input error.
- Filters combine only by AND, with each other and with the query. The query is optional
  when a filter is given. There is no OR, negation, range, or sorting; run several
  searches and combine them yourself.
- Any filter excludes spec artifacts.
- `--json` returns results with outgoing links and backlinks, plus `formatVersion`.

Filters are literal and metadata stays opaque: Relic never promises a key exists, types a
value, or reports a missing key. Nested objects match only by presence. What a key means
belongs to the project.
