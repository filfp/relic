import { join } from "path";
import { readJson, writeJson, fileExists } from "./fs.ts";
import { unlinkSync } from "fs";

export interface ProjectConfig {
  engines: string[];
  mode: "md" | "html";
}

const DEFAULT_CONFIG: ProjectConfig = { engines: [], mode: "md" };

export function readProjectConfig(relicDir: string): ProjectConfig {
  const configPath = join(relicDir, "config.json");
  const legacyPath = join(relicDir, "engines.json");

  if (fileExists(configPath)) {
    try {
      const raw = readJson<unknown>(configPath);
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        const engines = Array.isArray(obj["engines"])
          ? (obj["engines"] as unknown[]).filter((e): e is string => typeof e === "string")
          : [];
        const mode = obj["mode"] === "html" ? "html" : "md";
        return { engines, mode };
      }
    } catch {
      // fall through to default
    }
    return { ...DEFAULT_CONFIG };
  }

  // Silent migration: engines.json → config.json
  if (fileExists(legacyPath)) {
    try {
      const raw = readJson<unknown>(legacyPath);
      const engines = Array.isArray(raw)
        ? (raw as unknown[]).filter((e): e is string => typeof e === "string")
        : [];
      const migrated: ProjectConfig = { engines, mode: "md" };
      writeJson(configPath, migrated);
      try {
        unlinkSync(legacyPath);
      } catch {
        // best-effort removal
      }
      return migrated;
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  return { ...DEFAULT_CONFIG };
}

export function writeProjectConfig(relicDir: string, config: ProjectConfig): void {
  writeJson(join(relicDir, "config.json"), config);
}

export function readEngines(relicDir: string): string[] {
  return readProjectConfig(relicDir).engines;
}

export function writeEngines(relicDir: string, engines: string[]): void {
  const config = readProjectConfig(relicDir);
  const deduped = [...new Set(engines)].sort();
  writeProjectConfig(relicDir, { ...config, engines: deduped });
}

export function readMode(relicDir: string): "md" | "html" {
  return readProjectConfig(relicDir).mode;
}

export function writeMode(relicDir: string, mode: "md" | "html"): void {
  const config = readProjectConfig(relicDir);
  writeProjectConfig(relicDir, { ...config, mode });
}
