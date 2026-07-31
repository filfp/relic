#!/usr/bin/env bun
import { execFileSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

// --- arg parsing ---
const args = process.argv.slice(2);
const positional: string[] = [];
let repository: string | null = null;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index]!;
  if (argument === "--repository") {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      console.error("Error: --repository requires npm or pypi");
      process.exit(1);
    }
    repository = value;
    index += 1;
  } else if (argument.startsWith("--")) {
    console.error(`Error: unknown option '${argument}'`);
    process.exit(1);
  } else {
    positional.push(argument);
  }
}
const version = positional.length === 1 ? positional[0] : undefined;

if (!version) {
  console.error("Error: version is required");
  console.error("");
  console.error("Usage:");
  console.error("  bun run publish <version>                     # publish to npm + pypi");
  console.error("  bun run publish <version> --repository npm    # npm only");
  console.error("  bun run publish <version> --repository pypi   # pypi only");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Error: '${version}' is not valid semver (expected x.y.z)`);
  process.exit(1);
}

if (repository && !["npm", "pypi"].includes(repository)) {
  console.error(`Error: --repository must be 'npm' or 'pypi', got '${repository}'`);
  process.exit(1);
}

const tag = repository ? `v${version}-${repository}` : `v${version}`;
const releaseBranch = `release/${tag}`;

if (!readFileSync("CHANGELOG.md", "utf8").includes(`## [${version}]`)) {
  console.error(`Error: CHANGELOG.md requires a ## [${version}] release entry`);
  process.exit(1);
}

if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()) {
  console.error("Error: release preparation requires a clean worktree");
  process.exit(1);
}

console.log(`Version : ${version}`);
console.log(`Tag     : ${tag}`);
console.log(`Target  : ${repository ?? "npm + pypi"}`);
console.log("");

execFileSync("git", ["checkout", "-b", releaseBranch], { stdio: "inherit" });

// --- version bump helpers ---
function bumpJson(path: string) {
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  bumped ${path}`);
}

function bumpRegex(path: string, pattern: RegExp, replacement: string) {
  const src = readFileSync(path, "utf8");
  if (!pattern.test(src)) throw new Error(`Version marker not found in ${path}`);
  writeFileSync(path, src.replace(pattern, replacement));
  console.log(`  bumped ${path}`);
}

// --- bump all distribution version sites ---
bumpJson("package.json");
bumpJson("packages/cli-node/package.json");
bumpRegex("packages/cli-node/src/bin.ts", /const VERSION = "[^"]+"/, `const VERSION = "${version}"`);
bumpRegex("packages/cli-python/pyproject.toml", /^version = "[^"]+"/m, `version = "${version}"`);
bumpRegex("packages/cli-python/relic/__init__.py", /__version__ = "[^"]+"/, `__version__ = "${version}"`);

console.log("");

// --- commit and push branch (the merged release branch determines the tag target) ---
execFileSync("git", [
  "add",
  "package.json",
  "packages/cli-node/package.json",
  "packages/cli-node/src/bin.ts",
  "packages/cli-python/pyproject.toml",
  "packages/cli-python/relic/__init__.py",
], { stdio: "inherit" });
execFileSync("git", ["commit", "-m", `chore: bump version to ${version}`], {
  stdio: "inherit",
});
execFileSync("git", ["push", "-u", "origin", releaseBranch], {
  stdio: "inherit",
});

console.log("");
console.log(`Branch pushed: ${releaseBranch}`);
console.log("");
console.log(`Next:`);
console.log(`  1. Open a PR for the prepared release branch`);
console.log(`  2. Merge the PR — the ${tag} tag is created automatically on merge to main`);
console.log(`  3. The tag workflow dispatches publication to: ${repository ?? "npm + pypi"}`);
console.log(`  https://github.com/filfp/relic/pull/new/${releaseBranch}`);
