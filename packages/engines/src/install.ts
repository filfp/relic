import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, posix, resolve, sep } from "node:path";

import { dirExists, ensureDir } from "@relic/utility";

import { RELIC_SKILL_FILES } from "./generated/relic-skill.ts";

export { RELIC_SKILL_FILES };

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
  skillFiles?: Readonly<Record<string, string>>;
}

export interface InstalledSkill {
  engine: Engine;
  path: string;
}

export function isEngine(value: string): value is Engine {
  return (SUPPORTED_ENGINES as readonly string[]).includes(value);
}

function validatedSkillFiles(
  skillFiles: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  if (typeof skillFiles["SKILL.md"] !== "string") {
    throw new Error("Embedded Relic skill is incomplete: missing SKILL.md");
  }
  for (const [path, content] of Object.entries(skillFiles)) {
    const normalized = posix.normalize(path);
    if (
      path.length === 0 ||
      path.includes("\\") ||
      isAbsolute(path) ||
      normalized !== path ||
      normalized === ".." ||
      normalized.startsWith("../")
    ) {
      throw new Error(`Embedded Relic skill has an unsafe path: ${path}`);
    }
    if (typeof content !== "string") {
      throw new Error(`Embedded Relic skill has invalid content: ${path}`);
    }
  }
  return skillFiles;
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
  const skillFiles = validatedSkillFiles(
    options.skillFiles ?? RELIC_SKILL_FILES,
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
    mkdirSync(stagedSkill);
    for (const [relativePath, content] of Object.entries(skillFiles)) {
      const destination = join(stagedSkill, ...relativePath.split("/"));
      ensureDir(dirname(destination));
      writeFileSync(destination, content, "utf8");
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
