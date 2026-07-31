#!/usr/bin/env bun

import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

const ROOT = join(import.meta.dir, "..");
const NODE_BUNDLE = join(ROOT, "packages", "cli-node", "dist", "relic.js");
const BUN_BINARY = join(ROOT, "dist", "relic");
const SKILL_ROOT = join(ROOT, "skills", "relic");
const TEMPORARY_PROJECTS = new Set<string>();

function fail(message: string): never {
  throw new Error(`distribution test failed: ${message}`);
}

function run(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): string {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(
      [
        `${command} ${args.join(" ")} exited with ${result.status}`,
        result.stdout,
        result.stderr,
      ].filter(Boolean).join("\n"),
    );
  }
  return result.stdout;
}

function files(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        visit(path);
      } else {
        result[relative(root, path).replaceAll("\\", "/")] =
          readFileSync(path, "utf8");
      }
    }
  };
  visit(root);
  return result;
}

function expectEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${message}\nexpected: ${JSON.stringify(expected)}\nactual: ${JSON.stringify(actual)}`);
  }
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return await Promise.race([
    new Promise<boolean>((resolveExit) => {
      child.once("exit", () => resolveExit(true));
    }),
    Bun.sleep(timeoutMs).then(() => false),
  ]);
}

async function verifyViewer(projectDir: string): Promise<void> {
  const child = spawn(
    "node",
    [NODE_BUNDLE, "serve"],
    {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  try {
    const deadline = Date.now() + 5_000;
    let response: Response | undefined;
    while (Date.now() < deadline) {
      const url = stdout.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) {
        try {
          response = await fetch(url);
          if (response.ok) break;
        } catch {
          // The URL can be printed just before the socket accepts requests.
        }
      }
      if (child.exitCode !== null) break;
      await Bun.sleep(50);
    }
    if (!response?.ok) {
      fail(`bundled viewer did not start on localhost\n${stdout}\n${stderr}`);
    }
    const html = await response.text();
    if (!html.includes('<div id="root"></div>')) {
      fail("bundled viewer did not serve its application shell");
    }
  } finally {
    child.kill("SIGTERM");
    if (!await waitForExit(child, 2_000)) {
      child.kill("SIGKILL");
      if (!await waitForExit(child, 2_000)) {
        fail("bundled viewer process did not stop after SIGKILL");
      }
    }
  }
}

function verifyInstalledSkill(
  executable: string,
  prefix: string[],
  label: string,
): string {
  const projectDir = mkdtempSync(join(tmpdir(), `relic-${label}-`));
  TEMPORARY_PROJECTS.add(projectDir);
  const agents = "# Project-owned agent instructions\n";
  writeFileSync(join(projectDir, "AGENTS.md"), agents);

  run(executable, [...prefix, "init", "--dir", projectDir]);
  const relicEntry = readFileSync(join(projectDir, ".relic", "RELIC.md"), "utf8");
  const canonical = files(SKILL_ROOT);

  for (const [engine, root] of [
    ["claude", ".claude"],
    ["copilot", ".github"],
    ["codex", ".codex"],
  ] as const) {
    run(executable, [...prefix, "install", "--engine", engine], {
      cwd: projectDir,
    });
    const installed = join(
      projectDir,
      root,
      "skills",
      "relic",
    );
    expectEqual(files(installed), canonical, `${label} changed the ${engine} skill`);
  }

  const discovered = run(executable, [...prefix, "install"], {
    cwd: projectDir,
  });
  for (const engine of ["claude", "copilot", "codex"]) {
    if (!discovered.includes(`${engine}:`)) {
      fail(`${label} did not discover the existing ${engine} root`);
    }
  }

  expectEqual(
    readFileSync(join(projectDir, "AGENTS.md"), "utf8"),
    agents,
    `${label} modified AGENTS.md`,
  );
  expectEqual(
    readFileSync(join(projectDir, ".relic", "RELIC.md"), "utf8"),
    relicEntry,
    `${label} modified project knowledge during engine installation`,
  );

  run(executable, [...prefix, "search", "project", "--json"], {
    cwd: projectDir,
  });
  return projectDir;
}

try {
  console.log("Building self-contained npm and Bun artifacts...");
  run("bun", ["run", "build:npm"]);
  run("bun", [
    "build",
    "packages/cli-node/src/bin.ts",
    "--compile",
    "--outfile",
    "dist/relic",
  ]);

  const nodeProject = verifyInstalledSkill(
    "node",
    [NODE_BUNDLE],
    "node-bundle",
  );
  verifyInstalledSkill(BUN_BINARY, [], "bun-binary");
  await verifyViewer(nodeProject);

  const pack = JSON.parse(
    run("npm", ["pack", "--dry-run", "--json"], {
      cwd: join(ROOT, "packages", "cli-node"),
    }),
  ) as Array<{ files: Array<{ path: string }> }>;
  const packagedFiles = pack[0]?.files.map((file) => file.path).sort();
  expectEqual(
    packagedFiles,
    [
      "LICENSE",
      "README.md",
      "THIRD_PARTY_NOTICES.md",
      "dist/relic.js",
      "package.json",
    ],
    "npm package contains an unexpected file set",
  );

  const bundle = readFileSync(NODE_BUNDLE, "utf8");
  if (bundle.includes(join(ROOT, "skills", "relic"))) {
    fail("npm bundle still depends on the source checkout skill path");
  }
} finally {
  for (const projectDir of TEMPORARY_PROJECTS) {
    rmSync(projectDir, { recursive: true, force: true });
  }
}

console.log(
  "Distribution verified: npm bundle, Bun binary, viewer, native engine discovery, and package contents.",
);
