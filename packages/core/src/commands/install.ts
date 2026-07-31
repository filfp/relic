import { dirname, join, resolve } from "node:path";

import {
  canonicalSkillSource,
  discoverEngines,
  installRelicSkill,
  isEngine,
  SUPPORTED_ENGINES,
  type Engine,
  type InstalledSkill,
} from "@relic/engines";
import { fileExists, findRelicDir } from "@relic/utility";

export interface InstallOptions {
  engine?: string;
  projectDir?: string;
  skillSourceDir?: string;
}

export interface InstallResult {
  projectDir: string;
  installed: InstalledSkill[];
}

function resolveProjectDir(projectDir?: string): string {
  if (projectDir) return resolve(projectDir);
  const relicDir = findRelicDir(process.cwd());
  if (!relicDir) throw new Error("Not in a Relic project. Run: relic init");
  return dirname(relicDir);
}

export async function runInstall(
  options: InstallOptions = {},
): Promise<InstallResult> {
  const projectDir = resolveProjectDir(options.projectDir);
  if (!fileExists(join(projectDir, ".relic", "RELIC.md"))) {
    throw new Error("Missing .relic/RELIC.md. Run: relic init");
  }

  let engines: Engine[];
  if (options.engine !== undefined) {
    if (!isEngine(options.engine)) {
      throw new Error(
        `Unknown engine "${options.engine}". Supported: ${SUPPORTED_ENGINES.join(", ")}`,
      );
    }
    engines = [options.engine];
  } else {
    engines = discoverEngines(projectDir);
    if (engines.length === 0) {
      throw new Error(
        `No project-local engine root found. Pass --engine <${SUPPORTED_ENGINES.join("|")}>`,
      );
    }
  }

  const skillSourceDir = options.skillSourceDir ?? canonicalSkillSource();
  const installed = engines.map((engine) =>
    installRelicSkill({ engine, projectDir, skillSourceDir })
  );

  console.log("Relic skill installed:");
  for (const item of installed) {
    console.log(`  ${item.engine}: ${item.path}`);
  }
  return { projectDir, installed };
}
