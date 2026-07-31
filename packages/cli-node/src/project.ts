import { lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function fileExists(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

export function isRelicProjectRoot(path: string): boolean {
  return fileExists(join(path, "relic.yaml"));
}

export function findRelicProjectRoot(startDir: string): string | null {
  let current = startDir;
  while (true) {
    if (isRelicProjectRoot(current)) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function resolveRelicProjectDir(projectDir?: string): string {
  if (projectDir !== undefined) {
    const resolved = resolve(projectDir);
    if (!isRelicProjectRoot(resolved)) {
      throw new Error("Missing relic.yaml. Run: relic init");
    }
    return resolved;
  }

  const projectRoot = findRelicProjectRoot(process.cwd());
  if (!projectRoot) throw new Error("Not in a Relic project. Run: relic init");
  return projectRoot;
}
