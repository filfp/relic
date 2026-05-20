# Fix: 2026-05-20-publish-credentials-stale-after-repo-rename

**Date:** 2026-05-20
**Owning spec:** 004-cli-self-upgrade
**Status:** pending

---

## Issue

Both the npm and PyPI publish CI jobs failed on the v0.8.16 release with credential/identity errors.

**npm (`publish-npm.yml`):**
```
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/relic-cli
npm error 404 The requested resource 'relic-cli@0.8.16' could not be found or
             you do not have permission to access it.
```

**PyPI (`publish-pypi.yml`):**
```
invalid-publisher: valid token, but no corresponding publisher
(Publisher with matching claims was not found)
* repository: filfp/relic
* repository_owner: filfp
```

## Root Cause

**Classification:** code-bug

The repository was renamed from `filipefpaulo/relic` to `filfp/relic`. Both publish mechanisms were configured for the old repository identity and were never updated:

- **npm:** The `NPM_TOKEN` secret stored in GitHub Actions belongs to the npm account that published the first versions of `relic-cli`. After the repo rename (and potential account change), the token no longer has publish access. The 404 is npm's response when the token is valid but unauthorised for the target package.

- **PyPI:** Trusted publishing uses OIDC claims to verify the publisher. The PyPI project `relic-cli` has a trusted publisher configured with `repository: filipefpaulo/relic`. The actual OIDC claims coming from CI now assert `repository: filfp/relic`, which doesn't match — hence `invalid-publisher`.

Neither failure involves a code defect in the workflow files themselves. The workflows are correct; the external trust configuration is stale.

## Proposed Changes

### Code changes

**`packages/cli-node/package.json`** — update `repository.url` and `homepage` from `filipefpaulo/relic` to `filfp/relic`. npm's provenance signing validates that `repository.url` matches the OIDC claim `repository: filfp/relic` — a mismatch causes E422 even after the token is valid.

### Infrastructure / credential changes (manual, outside the codebase)

**1. npm — update `NPM_TOKEN` secret:**
- Go to the npm account that owns the `relic-cli` package
- Create a new Automation token (or Granular Access Token scoped to `relic-cli`)
- In GitHub → `filfp/relic` → Settings → Secrets and variables → Actions → update `NPM_TOKEN`

**2. PyPI — update trusted publisher:**
- Go to PyPI → `relic-cli` → Manage → Publishing
- Remove the trusted publisher entry for `filipefpaulo/relic` (if it exists)
- Add a new trusted publisher:
  - Owner: `filfp`
  - Repository: `relic`
  - Workflow: `publish-pypi.yml`
  - Environment: (leave blank — the workflow does not declare an environment)

After both are updated, re-trigger the publish by pushing the `v0.8.16` tag again (or deleting and re-creating it).

### Spec amendments

None — the spec's intent (publish to npm + PyPI from CI) is correct. This is a configuration drift caused by the repo rename.

### Shared artifact changes

`DistributionDomain.md` should be updated to note that trusted publisher configuration is required on both PyPI and npm for CI to work. Minor documentation addition only — no contract change.

## Changelog entry (draft)

```
fix(004): update stale repo references after rename to filfp/relic

Both publish workflows failed on v0.8.16 because the repository moved
from filipefpaulo/relic to filfp/relic. Three things needed updating:
(1) packages/cli-node/package.json repository.url and homepage — npm
provenance signing validates this against the OIDC repository claim;
(2) the NPM_TOKEN secret in GitHub Actions — the old token had no
publish access; (3) the PyPI trusted publisher — re-configured for
filfp/relic with no environment.
```
