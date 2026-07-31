import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  renameSync,
  readdirSync,
  realpathSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

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
identities of that kind, and use one greater than the greatest valid current identity.
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

  const stagingDir = mkdtempSync(join(projectDir, ".relic-init-"));
  let removedEmptyTarget = false;
  try {
    mkdirSync(join(stagingDir, "specs"));
    mkdirSync(join(stagingDir, "shared"));
    writeFileSync(join(stagingDir, "RELIC.md"), RELIC_PROJECT_FILE, {
      encoding: "utf8",
      flag: "wx",
    });

    if (existsSync(relicDir)) {
      rmdirSync(relicDir);
      removedEmptyTarget = true;
    }
    renameSync(stagingDir, relicDir);
  } catch (error) {
    if (removedEmptyTarget && !existsSync(relicDir)) mkdirSync(relicDir);
    throw error;
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }

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
