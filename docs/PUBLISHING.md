# Publishing Relic

This is conventional, project-owned operational guidance for publishing Relic.
It lives outside the topology in `relic.yaml` and is not a canonical Relic
document or a release command exposed by the Relic product.

## Release channels

Relic publishes the same product version through two distribution channels:

| Channel | Package | Automation |
| --- | --- | --- |
| npm | `relic-cli` | `.github/workflows/publish-npm.yml` |
| PyPI | `relic-cli` native wheels | `.github/workflows/publish-pypi.yml` |

A release may target both channels or intentionally target only one:

```bash
# npm and PyPI
bun run publish 1.0.0

# npm only
bun run publish 1.0.0 --repository npm

# PyPI only
bun run publish 1.0.0 --repository pypi
```

`--repository` is a release decision for that version, not a staged rollout.
The preparation script bumps every version site even when only one registry is
selected, and a later preparation of the same version would have no version
change to commit. If both registries should eventually receive a version, use
the default two-channel command from the start.

## Before preparing a release

The release operator must:

1. start from an updated `main` branch;
2. add a `## [x.y.z]` entry to `CHANGELOG.md` and commit it;
3. run the complete validation suite;
4. leave the worktree clean;
5. have permission to push a branch to `origin`.

```bash
git switch main
git pull --ff-only
bun install --frozen-lockfile
bun audit
bun run lint
bun run typecheck
bun run test
bun run test:distribution
git status --short
```

The script itself enforces strict `x.y.z` semver, the matching changelog heading,
and a clean worktree. It does **not** verify that the current branch is `main`,
that it is synchronized with `origin/main`, or that local validation passed.

## What release preparation does

[`scripts/publish.ts`](../scripts/publish.ts) performs local preparation. For
version `1.2.3`, it:

1. creates one of these branches from the current `HEAD`:
   - `release/v1.2.3` for npm and PyPI;
   - `release/v1.2.3-npm` for npm only;
   - `release/v1.2.3-pypi` for PyPI only;
2. updates the root workspace version, npm package version, CLI runtime version,
   Python project version, and Python module version;
3. creates `chore: bump version to 1.2.3`;
4. pushes the release branch to `origin`;
5. prints the URL for opening its pull request.

The script does not create or merge the pull request and does not publish a
package directly.

Inspect the resulting commit, open the printed pull request, and let the normal
pull-request CI finish before merging.

## What happens after merge

[`tag-release.yml`](../.github/workflows/tag-release.yml) runs only when a pull
request into `main` is merged and its source branch begins with `release/v`.
It validates the branch name, all five version sites, and the changelog entry,
then tags the pull-request merge commit:

- `v1.2.3` dispatches npm and PyPI;
- `v1.2.3-npm` dispatches npm only;
- `v1.2.3-pypi` dispatches PyPI only.

The npm workflow installs pinned dependencies, embeds the current skill and
viewer, builds the Node bundle, and publishes with npm provenance.

The PyPI workflow compiles and smoke-tests native binaries, builds and verifies
wheels for Linux x64/arm64, macOS x64/arm64, and Windows x64, then publishes the
collected wheels through trusted publishing.

The tag is the immutable release input. Do not manually publish from a moving
branch to work around a failed workflow.

## Retry a failed channel

If one channel fails after a two-channel release, do not create another release
branch or bump the version again. Re-run the failed workflow for the existing
tag in GitHub Actions.

With the GitHub CLI:

```bash
gh run list --workflow publish-npm.yml
gh run list --workflow publish-pypi.yml
gh run rerun <run-id> --failed
```

Confirm that the selected run belongs to the intended release tag before
rerunning it. If the registry already contains the version, investigate the
workflow result instead of attempting another upload; registry versions are
immutable.

## Local build and publication helpers

These commands exercise distribution pieces but do not replace the tagged
release flow:

```bash
# Build the Node bundle without publishing
bun run build:npm

# Build one native binary for a wheel target
bun run build:pypi:linux-x64
bun run build:pypi:linux-arm64
bun run build:pypi:macos-x64
bun run build:pypi:macos-arm64
bun run build:pypi:windows-x64

# Verify the complete local distribution boundary
bun run test:distribution
```

`bun run publish:npm` performs an immediate local npm publish from the current
worktree. It bypasses the release branch, tag validation, CI matrix, and the
workflow's provenance flag, so it is not the normal release path. There is no
equivalent direct local PyPI publish command; PyPI publication is owned by its
trusted workflow.

## Changing publishing behavior

Keep these files coherent when changing the release contract:

- `scripts/publish.ts` for release preparation;
- `.github/workflows/tag-release.yml` for merged-branch validation and dispatch;
- `.github/workflows/publish-npm.yml` for the npm artifact;
- `.github/workflows/publish-pypi.yml` for native wheels and PyPI publication;
- all version-bearing package files and `CHANGELOG.md`;
- this document and the release section of `CONTRIBUTING.md`.

Publishing code is a supply-chain boundary. Keep actions and dependencies pinned,
preserve least-privilege workflow permissions, and validate changes through a
pull request before using them for a release.
