#!/usr/bin/env bun

import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT = join(import.meta.dir, "..");
const NODE_BUNDLE = join(ROOT, "packages", "cli-node", "dist", "relic.js");
const BUN_BINARY = join(ROOT, "dist", "relic");
const SKILL_ROOT = join(ROOT, "skills", "relic");

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

async function availablePort(): Promise<number> {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("could not allocate a local test port"));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolvePort(address.port);
      });
    });
  });
}

async function verifyViewer(projectDir: string): Promise<void> {
  const port = await availablePort();
  const child = spawn(
    "node",
    [NODE_BUNDLE, "serve", "--port", String(port)],
    {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  try {
    const deadline = Date.now() + 5_000;
    let response: Response | undefined;
    while (Date.now() < deadline) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/`);
        if (response.ok) break;
      } catch {
        // The process may still be binding its localhost socket.
      }
      await Bun.sleep(50);
    }
    if (!response?.ok) {
      fail(`bundled viewer did not start on localhost\n${stderr}`);
    }
    const html = await response.text();
    if (!html.includes('<div id="root"></div>')) {
      fail("bundled viewer did not serve its application shell");
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((resolveExit) => {
      if (child.exitCode !== null) {
        resolveExit();
        return;
      }
      child.once("exit", () => resolveExit());
    });
  }
}

function verifyInstalledSkill(
  executable: string,
  prefix: string[],
  label: string,
): string {
  const projectDir = mkdtempSync(join(tmpdir(), `relic-${label}-`));
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

console.log("Building self-contained npm and Bun artifacts...");
run("bun", ["run", "build:npm"]);
run("bun", [
  "build",
  "packages/cli-node/src/bin.ts",
  "--compile",
  "--outfile",
  "dist/relic",
  "--define",
  'INSTALL_CHANNEL="npm"',
]);

const nodeProject = verifyInstalledSkill(
  "node",
  [NODE_BUNDLE],
  "node-bundle",
);
const binaryProject = verifyInstalledSkill(BUN_BINARY, [], "bun-binary");

try {
  await verifyViewer(nodeProject);

  const pack = JSON.parse(
    run("npm", ["pack", "--dry-run", "--json"], {
      cwd: join(ROOT, "packages", "cli-node"),
    }),
  ) as Array<{ files: Array<{ path: string }> }>;
  const packagedFiles = pack[0]?.files.map((file) => file.path).sort();
  expectEqual(
    packagedFiles,
    ["README.md", "dist/relic.js", "package.json"],
    "npm package contains an unexpected file set",
  );

  const bundle = readFileSync(NODE_BUNDLE, "utf8");
  if (bundle.includes(join(ROOT, "skills", "relic"))) {
    fail("npm bundle still depends on the source checkout skill path");
  }
} finally {
  rmSync(nodeProject, { recursive: true, force: true });
  rmSync(binaryProject, { recursive: true, force: true });
}

console.log(
  "Distribution verified: npm bundle, Bun binary, viewer, native engine discovery, and package contents.",
);
