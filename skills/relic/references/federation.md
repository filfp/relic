# Federated Project Knowledge

Read this reference only when the selected project boundary declares
`federation.members`.

## Keep the Selected Boundary Honest

The selected `relic.yaml` is `root` for the current view. Its explicitly declared members
and their explicitly declared descendants are reachable project knowledge. Do not inspect
ancestors for a larger federation and do not scan the filesystem for undeclared
`relic.yaml` files.

Each reached project retains its own topology, document identities, governance, and
authoring authority. Hierarchical addresses such as `root/backend/domain` disambiguate
the view; they are not prefixes to persist in document IDs. Equal IDs, paths, record
kinds, or overlapping corpus roots do not establish global ownership and are not yours
to reconcile without developer direction.

Use Relic search or the viewer when they provide the composed model. Native filesystem,
text, and symbol search remain valid for investigation, but do not infer additional
federation edges from files you happen to find.

## Confront Across Projects Without Flattening Them

- Use relevant descendant knowledge when reasoning from an ancestor federation view.
- When working from a nested project selected as `root`, use only that project and its
  declared descendants; global monorepo knowledge is intentionally absent.
- Treat unavailable or invalid member edges as localized evidence. Continue with every
  independently readable project instead of treating the entire view as unusable.
- Ordinary relative links may become canonical from an ancestor into a reachable
  descendant. Do not assume descendant-to-ancestor or cross-branch links participate in
  the federated graph.

## Preserve Developer-Owned Authoring

Federation composes read models; it does not forbid ordinary file edits. When the
developer authorizes work in named root or member projects, edit each document under its
own topology and project instructions. A single requested change may legitimately update
documents in more than one project.

Do not choose a project owner from path overlap, duplicate knowledge into a global
corpus, or move a record across project boundaries to make the aggregate look simpler.
If the intended authoring owner materially changes governance or meaning and is not
established by the request or evidence, recommend a destination and ask the developer.
