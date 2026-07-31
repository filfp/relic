import {
  existsSync,
  realpathSync,
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

export const RELIC_CONFIG_FILE = `topology:
  specs: .relic/specs
  shared: .relic/shared
  records:
    fr: .relic/records/requirements/functional
    nfr: .relic/records/requirements/non-functional
    adr: .relic/records/decisions
    epic: .relic/records/epics
`;

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

  const relicConfig = join(projectDir, "relic.yaml");
  if (existsSync(relicConfig)) {
    throw new Error(
      `relic.yaml already exists in ${projectDir}; init will not overwrite it`,
    );
  }
  try {
    writeFileSync(relicConfig, RELIC_CONFIG_FILE, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    throw new Error(`Could not create relic.yaml in ${projectDir}`, {
      cause: error,
    });
  }

  const result = {
    projectDir,
    created: ["relic.yaml"],
  };

  console.log("Relic initialized.");
  for (const path of result.created) console.log(`  ${path}`);
  return result;
}
