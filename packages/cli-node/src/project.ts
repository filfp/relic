import { lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function dirExists(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function fileExists(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

export function isRelicProjectRoot(path: string): boolean {
  return dirExists(join(path, ".relic")) &&
    fileExists(join(path, ".relic", "RELIC.md"));
}

export function findRelicDir(startDir: string): string | null {
  let current = startDir;
  while (true) {
    const candidate = join(current, ".relic");
    if (isRelicProjectRoot(current)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function resolveRelicProjectDir(projectDir?: string): string {
  if (projectDir !== undefined) {
    const resolved = resolve(projectDir);
    if (!isRelicProjectRoot(resolved)) {
      throw new Error("Missing .relic/RELIC.md. Run: relic init");
    }
    return resolved;
  }

  const relicDir = findRelicDir(process.cwd());
  if (!relicDir) throw new Error("Not in a Relic project. Run: relic init");
  return dirname(relicDir);
}
