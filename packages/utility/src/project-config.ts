import { join, isAbsolute, resolve, sep } from "path";
import { readJson, writeJson, fileExists } from "./fs.ts";
import { unlinkSync } from "fs";

export const EXTERNAL_TYPES = ["fr", "nfr", "br", "adr", "us", "epic"] as const;
export type ExternalType = (typeof EXTERNAL_TYPES)[number];

/** Flat type → directory path map. Paths stored as given (absolute or relative
 *  to the .relic/ parent), resolved at runtime — never normalised on write. */
export type ExternalConfig = Partial<Record<ExternalType, string>>;

export interface ProjectConfig {
  engines: string[];
  mode: "md" | "html";
  external?: ExternalConfig;
}

const DEFAULT_CONFIG: ProjectConfig = { engines: [], mode: "md" };

function parseExternalConfig(raw: unknown): ExternalConfig | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const external: ExternalConfig = {};
  for (const type of EXTERNAL_TYPES) {
    if (typeof obj[type] === "string" && obj[type] !== "") external[type] = obj[type] as string;
  }
  return Object.keys(external).length > 0 ? external : undefined;
}

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
        const external = parseExternalConfig(obj["external"]);
        return external ? { engines, mode, external } : { engines, mode };
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

/* ── External spec integration (spec 009) ──────────────────────────────── */

export class ExternalConfigError extends Error {}

export function readExternalTypes(relicDir: string): ExternalConfig {
  return readProjectConfig(relicDir).external ?? {};
}

export function writeExternalType(relicDir: string, type: ExternalType, path: string): void {
  const config = readProjectConfig(relicDir);
  const external: ExternalConfig = { ...(config.external ?? {}), [type]: path };
  writeProjectConfig(relicDir, { ...config, external });
}

export function isExternalType(value: string): value is ExternalType {
  return (EXTERNAL_TYPES as readonly string[]).includes(value);
}

/** Resolve a type's configured directory to an absolute path (relative paths
 *  resolve against the .relic/ parent). Returns null when the type is not configured. */
export function resolveExternalDir(relicDir: string, type: ExternalType): string | null {
  const configured = readExternalTypes(relicDir)[type];
  if (!configured) return null;
  return isAbsolute(configured) ? resolve(configured) : resolve(join(relicDir, ".."), configured);
}

export interface ExternalEntry {
  entry: string;
  type: ExternalType;
  filename: string;
}

/** Parse an external_reads entry ("<type>/<filename>"). Separators are
 *  normalised, so entries written on Windows resolve everywhere. */
export function parseExternalEntry(entry: string): ExternalEntry {
  const normalised = entry.replace(/\\/g, "/");
  const slash = normalised.indexOf("/");
  if (slash <= 0 || slash === normalised.length - 1) {
    throw new ExternalConfigError(
      `Invalid external_reads entry "${entry}" — expected "<type>/<filename>"`
    );
  }
  const type = normalised.slice(0, slash);
  const filename = normalised.slice(slash + 1);
  if (!isExternalType(type)) {
    throw new ExternalConfigError(
      `Invalid external_reads entry "${entry}" — unknown type "${type}" (expected one of: ${EXTERNAL_TYPES.join(", ")})`
    );
  }
  return { entry: normalised, type, filename };
}

export interface ResolvedExternalRead extends ExternalEntry {
  resolved_path: string;
  exists: boolean;
}

/** Resolve an external_reads entry to an absolute path. Hard errors (thrown):
 *  malformed entry, unconfigured type, path traversal outside the type dir. */
export function resolveExternalRead(relicDir: string, entry: string): ResolvedExternalRead {
  const parsed = parseExternalEntry(entry);
  const dir = resolveExternalDir(relicDir, parsed.type);
  if (!dir) {
    throw new ExternalConfigError(
      `external_reads entry "${entry}" uses type "${parsed.type}" which is not configured in config.external — run: relic external set ${parsed.type} <path>`
    );
  }
  const resolved = resolve(dir, parsed.filename);
  if (resolved !== dir && !resolved.startsWith(dir + sep)) {
    throw new ExternalConfigError(
      `external_reads entry "${entry}" resolves outside its configured directory (path traversal is rejected)`
    );
  }
  return { ...parsed, resolved_path: resolved, exists: fileExists(resolved) };
}
