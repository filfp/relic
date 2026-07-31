import {
  cpSync,
  existsSync,
  mkdtempSync,
  realpathSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { dirExists, ensureDir, fileExists } from "@relic/utility";

export type Engine = "claude" | "copilot" | "codex";

export const SUPPORTED_ENGINES: readonly Engine[] = [
  "claude",
  "copilot",
  "codex",
];

export const ENGINE_SKILL_ROOTS: Record<Engine, string> = {
  claude: ".claude/skills",
  copilot: ".github/skills",
  codex: ".codex/skills",
};

const ENGINE_DISCOVERY_ROOTS: Record<Engine, string> = {
  claude: ".claude",
  copilot: ".github/skills",
  codex: ".codex",
};

export interface InstallSkillOptions {
  engine: Engine;
  projectDir: string;
  skillSourceDir?: string;
}

export interface InstalledSkill {
  engine: Engine;
  path: string;
}

export function isEngine(value: string): value is Engine {
  return (SUPPORTED_ENGINES as readonly string[]).includes(value);
}

export function canonicalSkillSource(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../skills/relic",
  );
}

function validatedSkillSource(skillSourceDir: string): string {
  if (!dirExists(skillSourceDir) || !fileExists(join(skillSourceDir, "SKILL.md"))) {
    throw new Error(`Relic skill source is incomplete: ${skillSourceDir}`);
  }
  return realpathSync(skillSourceDir);
}

function isInside(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}${sep}`);
}

function assertLocalEngineRoot(projectDir: string, engine: Engine): void {
  const rootName = ENGINE_SKILL_ROOTS[engine].split("/")[0];
  if (!rootName) throw new Error(`Invalid engine root for ${engine}`);
  const nativeRoot = join(projectDir, rootName);
  if (!existsSync(nativeRoot)) return;
  const realNativeRoot = realpathSync(nativeRoot);
  if (!isInside(projectDir, realNativeRoot)) {
    throw new Error(`${engine} engine root escapes the project: ${nativeRoot}`);
  }
}

export function discoverEngines(projectDir: string): Engine[] {
  return SUPPORTED_ENGINES.filter((engine) =>
    dirExists(join(projectDir, ENGINE_DISCOVERY_ROOTS[engine]))
  );
}

export function installRelicSkill(options: InstallSkillOptions): InstalledSkill {
  const projectDir = realpathSync(resolve(options.projectDir));
  const skillSourceDir = validatedSkillSource(
    resolve(options.skillSourceDir ?? canonicalSkillSource()),
  );
  assertLocalEngineRoot(projectDir, options.engine);

  const skillsRoot = join(projectDir, ENGINE_SKILL_ROOTS[options.engine]);
  const target = join(skillsRoot, "relic");
  ensureDir(skillsRoot);
  if (!isInside(projectDir, realpathSync(skillsRoot))) {
    throw new Error(`${options.engine} skills root escapes the project`);
  }

  const stagingRoot = mkdtempSync(join(skillsRoot, ".relic-install-"));
  const stagedSkill = join(stagingRoot, "relic");
  try {
    cpSync(skillSourceDir, stagedSkill, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
    if (!fileExists(join(stagedSkill, "SKILL.md"))) {
      throw new Error("Staged Relic skill is incomplete");
    }
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    renameSync(stagedSkill, target);
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }

  return {
    engine: options.engine,
    path: target,
  };
}
