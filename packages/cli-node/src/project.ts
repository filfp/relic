import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

function dirExists(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

export function findRelicDir(startDir: string): string | null {
  let current = startDir;
  while (true) {
    const candidate = join(current, ".relic");
    if (dirExists(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
