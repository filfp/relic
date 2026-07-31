import {
  discoverEngines,
  installRelicSkill,
  isEngine,
  SUPPORTED_ENGINES,
  type Engine,
  type InstalledSkill,
} from "@relic/engines";
import { resolveRelicProjectDir } from "../project.ts";

export interface InstallOptions {
  engine?: string;
  projectDir?: string;
}

export interface InstallResult {
  projectDir: string;
  installed: InstalledSkill[];
}

export async function runInstall(
  options: InstallOptions = {},
): Promise<InstallResult> {
  const projectDir = resolveRelicProjectDir(options.projectDir);

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

  const installed = engines.map((engine) =>
    installRelicSkill({ engine, projectDir })
  );

  console.log("Relic skill installed:");
  for (const item of installed) {
    console.log(`  ${item.engine}: ${item.path}`);
  }
  return { projectDir, installed };
}
