import {
  existsSync,
  lstatSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { ensureDir } from "@relic/utility";

export interface InitOptions {
  dir: string;
}

export interface InitResult {
  projectDir: string;
  created: string[];
}

export const RELIC_PROJECT_FILE = `---
topology:
  specs: .relic/specs
  shared: .relic/shared
  records:
    fr: docs/requirements/functional
    nfr: docs/requirements/non-functional
    adr: docs/decisions
    epic: docs/epics
---

# Relic Project Knowledge

This file maps the current Relic knowledge corpus. Add project-specific guidance below
without turning this map into a project-governance schema.

When creating numbered knowledge, follow the current topology, inspect current canonical
identities of that kind, and write directly at the next available value.
`;

function existingEntries(path: string): string[] {
  if (!existsSync(path)) return [];
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    throw new Error(`${path} must not be a symbolic link`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`${path} exists and is not a directory`);
  }
  return readdirSync(path);
}

export async function runInit(options: InitOptions): Promise<InitResult> {
  let projectDir: string;
  try {
    projectDir = realpathSync(options.dir);
  } catch {
    throw new Error(`Project directory does not exist: ${options.dir}`);
  }
  if (!statSync(projectDir).isDirectory()) {
    throw new Error(`Project path is not a directory: ${options.dir}`);
  }

  const relicDir = join(projectDir, ".relic");
  const entries = existingEntries(relicDir);
  if (entries.length > 0) {
    throw new Error(
      `.relic/ already contains project files in ${projectDir}; init will not merge or overwrite them`,
    );
  }

  const specsDir = join(relicDir, "specs");
  const sharedDir = join(relicDir, "shared");
  ensureDir(specsDir);
  ensureDir(sharedDir);
  writeFileSync(join(relicDir, "RELIC.md"), RELIC_PROJECT_FILE, {
    encoding: "utf8",
    flag: "wx",
  });

  const result = {
    projectDir,
    created: [
      ".relic/RELIC.md",
      ".relic/specs/",
      ".relic/shared/",
    ],
  };

  console.log("Relic initialized.");
  for (const path of result.created) console.log(`  ${path}`);
  return result;
}
