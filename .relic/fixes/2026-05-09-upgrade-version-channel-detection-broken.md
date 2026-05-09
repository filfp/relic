# Fix: 2026-05-09-upgrade-version-channel-detection-broken

**Date:** 2026-05-09
**Owning spec:** 004-cli-self-upgrade
**Status:** solved

---

## Issue

`relic upgrade` is broken end-to-end on installed binaries:

1. **Current version always reports `0.8.0`** regardless of which version is actually
   installed (the latest published version is `0.8.14`). Inspecting the installed
   binary at `/Users/filfp/.bun/bin/relic` confirms `var VERSION = "0.8.0";` is baked
   into the bundle.
2. **Install channel is not detected** — the binary reports
   `"INSTALL_CHANNEL is not set (dev build). Cannot determine upgrade channel."`
   even though it was installed from npm. `strings` on the binary confirms there is
   no embedded `INSTALL_CHANNEL` constant; the `channel` variable falls through to the
   `"dev"` literal.

User context: this surfaced while reviewing recent system-prompt feature additions for
overall regressions. Upgrade is the first concrete regression they want addressed.

## Root Cause

**Classification:** code-bug

There are **two independent bugs** in the build/release pipeline. Neither the spec nor
the contracts are wrong — both are defects in code/config that drifted from their
intended behaviour.

### Bug A — `scripts/publish.ts` regex no longer matches `bin.ts`

`scripts/publish.ts:55` bumps the CLI version with this line:

```typescript
bumpRegex("packages/cli-node/src/bin.ts", /\.version\("[^"]+"\)/, `.version("${version}")`);
```

The regex matches `.version("X.Y.Z")` as a literal call, but `packages/cli-node/src/bin.ts`
was refactored to:

```typescript
const VERSION = "0.8.0";       // line 32
program.name("relic").version(VERSION);  // line 38
```

The regex now matches **nothing** in `bin.ts`. `bumpRegex` performs a
no-op `String.replace` and writes the file back unchanged. As a result, every release
since the refactor has shipped with `VERSION = "0.8.0"` baked into the bundle. The
`package.json` files (which the publish script also bumps) get the new version, but the
runtime constant the binary actually reads stays frozen at `0.8.0`.

### Bug B — npm CI build does not pass `--define 'INSTALL_CHANNEL="npm"'`

The published npm bundle is produced by `.github/workflows/publish-npm.yml`, which runs
`bun run build:npm` from the repo root. The **root** `package.json:build:npm` script is:

```
bun run build:templates && bun build packages/cli-node/src/bin.ts --target node --outfile packages/cli-node/dist/relic.js && node scripts/fix-shebang.mjs
```

It does **not** include `--define 'INSTALL_CHANNEL="npm"'`. The same omission exists in
the root `build:binary` script.

The correct define **does** exist in `packages/cli-node/package.json`, but those
scripts are never invoked by CI. The publish workflow uses the root scripts.

(For reference, the PyPI workflow `publish-pypi.yml` is correct — its compile step
inlines its own `bun build --compile ... --define 'INSTALL_CHANNEL="pypi"'` invocation
and does not go through a root npm script.)

So every npm-installed binary has `INSTALL_CHANNEL` undefined at runtime,
`upgrade.ts:17` resolves `channel = "dev"`, and `runUpgrade` short-circuits with the
FR-4 dev-build warning. This is exactly what the user is seeing — "channel of
installation isn't being found."

### Why this matches `code-bug` and not `misspecification`

The spec (FR-3, NFR-5, Decision section) is unambiguous: `INSTALL_CHANNEL` is embedded
at build time per channel. `tasks.md` Phase 0 (T-01, T-02, T-03) is checked off. The
intended behaviour is correct. The implementation drifted: the `--define` was added to
the **wrong** `package.json`'s build scripts (the inner workspace package one, not the
root one CI actually invokes), and a separate refactor moved the version literal out of
the regex's reach.

## Proposed Changes

### Code changes

1. **`scripts/publish.ts:55`** — replace the no-op regex with one that matches the
   current pattern. Two equally-valid options:
   - **Option A (preferred):** match the `const VERSION = "..."` declaration directly:
     ```typescript
     bumpRegex("packages/cli-node/src/bin.ts", /const VERSION = "[^"]+"/, `const VERSION = "${version}"`);
     ```
   - **Option B:** delete the `VERSION` constant in `bin.ts` and inline the version
     literal back into `.version("X.Y.Z")` so the existing regex matches again.

   Recommend Option A — it is the smaller diff and preserves the indirection that any
   downstream code (tests, future commands) reading `VERSION` already depends on.

2. **`package.json` (repo root)** — add `--define 'INSTALL_CHANNEL="npm"'` to:
   - `build:npm` (used by `publish-npm.yml`)
   - `build:binary` (used for local dev compiled binaries)

   And add `--define 'INSTALL_CHANNEL="pypi"'` to all five PyPI build scripts:
   - `build:pypi:linux-x64`
   - `build:pypi:linux-arm64`
   - `build:pypi:macos-x64`
   - `build:pypi:macos-arm64`
   - `build:pypi:windows-x64`

   The PyPI CI workflow (`publish-pypi.yml`) currently inlines its own
   `bun build --compile ... --define 'INSTALL_CHANNEL="pypi"'` invocation and does
   not call these scripts, so CI was not broken. But anyone running a PyPI build
   locally (e.g. `bun run build:pypi:macos-arm64` to test a wheel before release)
   was producing `"dev"` binaries — the same class of bug as the npm side. With both
   the workflow and the scripts now setting the same define, channel embedding is
   consistent regardless of how the build is invoked.

3. **`packages/cli-node/package.json`** (optional cleanup, not required for the fix) —
   the `--define` flags here are dead code; CI never runs these scripts. Either delete
   them or add a comment that they exist for parity with the root scripts. Leave for a
   later cleanup; do not bundle into this fix.

   Similarly, `.github/workflows/publish-pypi.yml` could be DRYed up to call
   `bun run build:pypi:<target>` instead of inlining its own bun build. Defer to a
   later cleanup — the inline command is now consistent with the scripts.

4. **One-shot republish** — after the fix lands, a fresh release (e.g. `0.8.15`) is
   required to ship a binary with the correct `VERSION` and embedded `INSTALL_CHANNEL`.
   Existing 0.8.x npm installs will still self-report as `0.8.0` until users
   reinstall manually. Document this in the changelog entry so users know to run
   `npm install -g relic-cli@latest` once.

### Spec amendments

None. The spec and the `UpgradeDomain` artifact already describe the correct
behaviour. No clarification needed.

### Shared artifact changes

None. `shared/domains/UpgradeDomain.md` already specifies `INSTALL_CHANNEL` is embedded
at build time and that `"dev"` is the fallback. No contract change.

## Changelog entry (draft)

```
### [2026-05-09] Fix: relic upgrade always reports 0.8.0 / channel-not-found

Two independent build-pipeline bugs caused `relic upgrade` to be broken on every
npm-installed binary since the introduction of the upgrade command:

1. `scripts/publish.ts` bumped the version with a regex that matched
   `.version("X.Y.Z")`, but `packages/cli-node/src/bin.ts` was refactored to read
   `const VERSION = "..."` and pass it to `.version(VERSION)`. The regex no longer
   matched, so the version constant was frozen at `0.8.0` for every release. Updated
   the regex to target the `const VERSION = "..."` declaration directly.

2. The repo-root `package.json` build scripts were missing the `INSTALL_CHANNEL`
   define. `build:npm` and `build:binary` (used by `publish-npm.yml`) needed
   `--define 'INSTALL_CHANNEL="npm"'`. The five `build:pypi:*` scripts needed
   `--define 'INSTALL_CHANNEL="pypi"'` so local PyPI builds match what CI emits
   (the PyPI workflow already inlines the correct define, but the local scripts did
   not). All seven scripts now embed their channel explicitly; the channel is
   consistent regardless of how the build is invoked.

Users on existing 0.8.x npm installs must reinstall once
(`npm install -g relic-cli@latest`) to pick up a binary with the correct embedded
`VERSION` and `INSTALL_CHANNEL`. Subsequent `relic upgrade` runs will then work
end-to-end.

Authorised by fix 2026-05-09-upgrade-version-channel-detection-broken.
```
