export { SNIPPETS } from "./generated/engine-templates.ts";

import { writeClaude } from "./engines/claude/index.ts";
import { writeCopilot } from "./engines/copilot/index.ts";
import { writeCodex } from "./engines/codex/index.ts";

export {
  canonicalSkillSource,
  discoverEngines,
  ENGINE_SKILL_ROOTS,
  installRelicSkill,
  isEngine,
  SUPPORTED_ENGINES,
} from "./install.ts";
export type {
  Engine,
  InstalledSkill,
  InstallSkillOptions,
} from "./install.ts";

import {
  SUPPORTED_ENGINES,
  type Engine,
} from "./install.ts";

export interface AddEngineOptions {
  engine: Engine;
  projectDir: string;
}

export async function runAddEngine(options: AddEngineOptions): Promise<void> {
  const { engine, projectDir } = options;

  switch (engine) {
    case "claude":
      writeClaude(projectDir);
      break;
    case "copilot":
      writeCopilot(projectDir);
      break;
    case "codex":
      writeCodex(projectDir);
      break;
    default: {
      const _exhaustive: never = engine;
      console.error(`Unknown engine: ${engine}. Supported: ${SUPPORTED_ENGINES.join(", ")}`);
      process.exit(1);
    }
  }
}
