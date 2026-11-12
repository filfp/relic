#!/usr/bin/env bash
# Called by the release-tag workflow with VERSION set: every version Relic ships must match
# the release branch, and the changelog must have its entry.
set -euo pipefail
npm_version=$(node -p "require('./packages/cli-node/package.json').version")
root_version=$(node -p "require('./package.json').version")
python_version=$(sed -n 's/^version = "\([^"]*\)"/\1/p' packages/cli-python/pyproject.toml)
binary_version=$(sed -n 's/^const VERSION = "\([^"]*\)";/\1/p' packages/cli-node/src/bin.ts)
module_version=$(sed -n 's/^__version__ = "\([^"]*\)"/\1/p' packages/cli-python/relic/__init__.py)
for v in "$npm_version" "$root_version" "$python_version" "$binary_version" "$module_version"; do
  if [[ "$v" != "$VERSION" ]]; then
    echo "Release $VERSION does not match package versions ($npm_version $root_version $python_version $binary_version $module_version)" >&2
    exit 1
  fi
done
if ! grep -Fq "## [$VERSION]" CHANGELOG.md; then
  echo "CHANGELOG.md has no ## [$VERSION] release entry" >&2
  exit 1
fi
