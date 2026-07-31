# Contributing to Relic

Relic self-hosts its current product knowledge. Read
[relic.yaml](relic.yaml) before changing behavior, then follow only the
canonical links relevant to the work. Historical migration documents are not product
authority; Git retains the removed Relic 1.x implementation and superseded decisions.

## Implementation boundaries

- packages/core is the pure topology, parsing, graph, diagnostics, and search read model.
- packages/cli-node owns the four-command CLI, project discovery, read-only HTTP API,
  and embedded viewer delivery.
- packages/engines owns project-local discovery and installation of the central skill.
- packages/viewer renders the core transport contract and does not interpret repository
  knowledge independently.
- skills/relic is the only source of truth for the distributed central skill.

Keep the public CLI limited to init, install, search, and serve. Do not introduce hidden
sessions, counters, locks, manifests, workflow modes, project-governance enforcement, or
AGENTS.md mutation.

## Development

Use Bun and exact dependency versions:

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run test:distribution
bun audit
```

Typecheck and test regenerate ignored embedded assets. Distribution tests build and
exercise the npm bundle and compiled Bun binary, install the same central skill for all
supported engines, query a disposable corpus, start the bundled viewer, and inspect npm
package contents.

Add focused tests at the boundary that owns changed behavior. A successful build does
not replace the relevant unit, HTTP, distribution, or native-runner test.

## Knowledge changes

Code changes do not automatically authorize documentation changes. When the current
product frontier changes, name the affected canonical Relic documents and update them
as a coherent reviewed change. Prefer correcting current knowledge over adding a
duplicate or retaining a superseded copy.

Ordinary repository-relative links form the knowledge web. Run a Relic search and inspect
the read-model diagnostics after moving knowledge or changing topology.

## Pull requests and releases

Keep commits coherent and explain the contract, implementation, and validation evidence
affected by the change. Security-sensitive reports belong in a private advisory; see
[SECURITY.md](SECURITY.md).

Prepare a release with:

```bash
bun run publish <version>
# or select one channel:
bun run publish <version> --repository npm
bun run publish <version> --repository pypi
```

The preparation script requires a clean main branch, matching current versions, and a
CHANGELOG release entry. It creates and pushes a release branch. After its pull request
is merged, the pinned release workflow validates versions, creates the target-specific
tag, and dispatches npm and/or trusted PyPI publication.
