import { execSync, spawnSync } from "child_process";
import { join } from "path";
import { readdirSync, statSync } from "fs";
import {
  findRelicDir,
  fileExists,
  dirExists,
  readJson,
  writeJson,
  readText,
  writeText,
  readSession,
  readExternalTypes,
  writeExternalType,
  resolveExternalDir,
  resolveExternalRead,
  isExternalType,
  ExternalConfigError,
  EXTERNAL_TYPES,
  slugify,
  inferSpecFromBranch,
  availableSpecs,
  type ExternalType,
} from "@relic/utility";
import { TEMPLATES } from "../generated/templates.ts";
import type { ArtifactsJson } from "../types.ts";

export interface ExternalOptions {
  /** Positional args after `relic external` — [] for the report form. */
  args: string[];
  path?: string;
  spec?: string;
  text?: boolean;
  relicDir?: string;
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function emit(result: unknown, text: boolean | undefined, render: () => void): void {
  if (text) render();
  else console.log(JSON.stringify(result, null, 2));
}

function resolveActiveSpec(relicDir: string, specArg?: string): string | null {
  if (specArg) return specArg;
  const envSpec = process.env["RELIC_SPEC"];
  if (envSpec) return envSpec;
  const sessionSpec = readSession(relicDir).spec;
  if (sessionSpec) return sessionSpec;
  try {
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return inferSpecFromBranch(branch);
  } catch {
    return null;
  }
}

function requireType(value: string): ExternalType {
  if (!isExternalType(value)) {
    fail(`unknown external type "${value}" — expected one of: ${EXTERNAL_TYPES.join(", ")}`);
  }
  return value;
}

function addExternalRead(relicDir: string, specId: string, entry: string): void {
  const artifactsPath = join(relicDir, "specs", specId, "artifacts.json");
  if (!fileExists(artifactsPath)) {
    fail(`spec "${specId}" has no artifacts.json — run: relic scaffold --spec ${specId}`);
  }
  const artifacts = readJson<ArtifactsJson & { external_reads?: string[] }>(artifactsPath);
  const reads = artifacts.external_reads ?? [];
  if (!reads.includes(entry)) reads.push(entry);
  writeJson(artifactsPath, { ...artifacts, external_reads: reads });
}

/* ── report (no args) ─────────────────────────────────────────────────── */

function runReport(relicDir: string, text?: boolean): void {
  const configured = readExternalTypes(relicDir);
  const typeKeys = Object.keys(configured) as ExternalType[];
  if (typeKeys.length === 0) {
    emit({ configured: false }, text, () =>
      console.log("No external spec directories configured. Run: relic external set <type> <path>")
    );
    return;
  }

  const types: Record<string, { path: string; exists: boolean; entries: Array<{ name: string; type: "file" | "dir" }> }> = {};
  for (const type of typeKeys) {
    const dir = resolveExternalDir(relicDir, type)!;
    const exists = dirExists(dir);
    const entries = exists
      ? readdirSync(dir)
          .sort()
          .map((name) => ({
            name,
            type: statSync(join(dir, name)).isDirectory() ? ("dir" as const) : ("file" as const),
          }))
      : [];
    types[type] = { path: configured[type]!, exists, entries };
  }

  emit({ configured: true, types }, text, () => {
    for (const [type, info] of Object.entries(types)) {
      console.log(`${type}: ${info.path}${info.exists ? "" : "  (missing!)"}`);
      for (const e of info.entries) console.log(`  ${e.type === "dir" ? "d " : "  "}${e.name}`);
    }
  });
}

/* ── set <type> <path> ────────────────────────────────────────────────── */

function runSet(relicDir: string, typeArg: string, path: string | undefined, text?: boolean): void {
  const type = requireType(typeArg);
  if (!path) fail(`usage: relic external set ${type} <path>`);
  const previous = readExternalTypes(relicDir)[type] ?? null;
  writeExternalType(relicDir, type, path);
  const resolved = resolveExternalDir(relicDir, type)!;
  const result = {
    success: true,
    type,
    previous_path: previous,
    new_path: path,
    exists: dirExists(resolved),
  };
  emit(result, text, () =>
    console.log(
      `external.${type} = ${path}${result.exists ? "" : "  (directory does not exist yet)"}`
    )
  );
}

/* ── link <type>/<filename> ───────────────────────────────────────────── */

function runLink(relicDir: string, entryArg: string, specArg: string | undefined, text?: boolean): void {
  let resolved;
  try {
    resolved = resolveExternalRead(relicDir, entryArg);
  } catch (err) {
    if (err instanceof ExternalConfigError) fail(err.message);
    throw err;
  }
  if (!resolved.exists) {
    fail(`"${entryArg}" does not exist at ${resolved.resolved_path} — create it first or check the filename`);
  }
  const specId = resolveActiveSpec(relicDir, specArg);
  if (!specId) {
    const specs = availableSpecs(join(relicDir, "specs"));
    fail(
      "could not resolve the active spec. Use --spec <id>, set RELIC_SPEC, or run: relic use <spec-id>" +
        (specs.length ? `\nAvailable specs: ${specs.join(", ")}` : "")
    );
  }
  addExternalRead(relicDir, specId, resolved.entry);
  const result = {
    success: true,
    entry: resolved.entry,
    type: resolved.type,
    filename: resolved.filename,
    resolved_path: resolved.resolved_path,
    exists: true,
    linked_to_spec: specId,
  };
  emit(result, text, () => console.log(`Linked ${resolved.entry} → ${specId}`));
}

/* ── create <type> <title...> ─────────────────────────────────────────── */

function gitDir(dir: string): boolean {
  const res = spawnSync("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"], { stdio: "pipe" });
  return res.status === 0 && res.stdout.toString().trim() === "true";
}

function nextExternalId(dir: string, prefix: string): number {
  const re = new RegExp(`^${prefix}-(\\d+)-`);
  let max = 0;
  for (const name of readdirSync(dir)) {
    const m = name.match(re);
    if (m) max = Math.max(max, parseInt(m[1]!, 10));
  }
  return max + 1;
}

function runCreate(
  relicDir: string,
  typeArg: string,
  titleParts: string[],
  specArg: string | undefined,
  text?: boolean
): void {
  const type = requireType(typeArg);
  const title = titleParts.join(" ").trim();
  if (!title) fail(`usage: relic external create ${type} "<title>"`);

  const dir = resolveExternalDir(relicDir, type);
  if (!dir) fail(`type "${type}" is not configured — run: relic external set ${type} <path>`);
  if (!dirExists(dir)) fail(`configured ${type} directory does not exist: ${dir}`);

  const specId = resolveActiveSpec(relicDir, specArg);
  if (!specId) {
    fail("could not resolve the active spec. Use --spec <id>, set RELIC_SPEC, or run: relic use <spec-id>");
  }

  const template = TEMPLATES[`external/${type}.md`];
  if (!template) fail(`no document template embedded for type "${type}"`);

  const prefix = type.toUpperCase();
  const slug = slugify(title).slice(0, 60).replace(/-$/, "");
  let n = nextExternalId(dir, prefix);
  let filename = `${prefix}-${String(n).padStart(3, "0")}-${slug}.md`;
  while (fileExists(join(dir, filename))) {
    n += 1;
    filename = `${prefix}-${String(n).padStart(3, "0")}-${slug}.md`;
  }
  const id = `${prefix}-${String(n).padStart(3, "0")}`;
  const date = new Date().toISOString().slice(0, 10);
  const filePath = join(dir, filename);

  writeText(
    filePath,
    template.replace(/\{\{ID\}\}/g, id).replace(/\{\{TITLE\}\}/g, title).replace(/\{\{DATE\}\}/g, date)
  );

  let committed = false;
  let commitSha: string | null = null;
  let warning: string | undefined;
  if (gitDir(dir)) {
    const add = spawnSync("git", ["-C", dir, "add", filePath], { stdio: "pipe" });
    const commit = spawnSync(
      "git",
      ["-C", dir, "commit", "-m", `docs(${type}): add ${id} — ${title}\n\nCreated via relic external create.`],
      { stdio: "pipe" }
    );
    if (add.status === 0 && commit.status === 0) {
      committed = true;
      const sha = spawnSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"], { stdio: "pipe" });
      commitSha = sha.status === 0 ? sha.stdout.toString().trim() : null;
    } else {
      warning = `document written but git commit failed: ${commit.stderr.toString().trim() || add.stderr.toString().trim()}`;
    }
  } else {
    warning = `${dir} is not inside a git repository — document written but not committed`;
  }

  const entry = `${type}/${filename}`;
  addExternalRead(relicDir, specId, entry);

  const result: Record<string, unknown> = {
    success: true,
    type,
    filename,
    resolved_path: filePath,
    external_reads_entry: entry,
    linked_to_spec: specId,
    committed,
    commit_sha: commitSha,
  };
  if (warning) result["warning"] = warning;

  emit(result, text, () => {
    console.log(`Created ${filename} (${id})`);
    console.log(`  ${filePath}`);
    console.log(`  linked to ${specId}${committed ? `, committed ${commitSha}` : ""}`);
    if (warning) console.log(`  Warning: ${warning}`);
  });
}

/* ── list [--spec <id>] ───────────────────────────────────────────────── */

function runList(relicDir: string, specFilter: string | undefined, text?: boolean): void {
  const specsDir = join(relicDir, "specs");
  const specIds = (specFilter ? [specFilter] : availableSpecs(specsDir)).sort();
  const entries: Array<Record<string, unknown>> = [];

  for (const specId of specIds) {
    const artifactsPath = join(specsDir, specId, "artifacts.json");
    if (!fileExists(artifactsPath)) continue;
    const artifacts = readJson<{ external_reads?: string[] }>(artifactsPath);
    for (const entry of artifacts.external_reads ?? []) {
      try {
        const r = resolveExternalRead(relicDir, entry);
        entries.push({
          spec: specId,
          entry: r.entry,
          type: r.type,
          filename: r.filename,
          resolved_path: r.resolved_path,
          exists: r.exists,
        });
      } catch (err) {
        entries.push({
          spec: specId,
          entry,
          type: entry.split("/")[0] ?? "",
          filename: entry.split("/").slice(1).join("/"),
          resolved_path: null,
          exists: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  emit({ entries }, text, () => {
    if (!entries.length) {
      console.log("No external_reads declared in any spec.");
      return;
    }
    for (const e of entries) {
      console.log(`${e["exists"] ? "✓" : "✗"} ${e["spec"]}: ${e["entry"]}${e["error"] ? `  (${e["error"]})` : ""}`);
    }
  });
}

/* ── init <remote-url> [--path <local-path>] ──────────────────────────── */

function runInitSubmodule(
  relicDir: string,
  remoteUrl: string,
  localPath: string | undefined,
  text?: boolean
): void {
  const projectDir = join(relicDir, "..");
  if (!gitDir(projectDir)) {
    fail("the project is not a git repository — relic external init requires git");
  }
  const submodulePath = localPath ?? "specs/";
  const res = spawnSync("git", ["-C", projectDir, "submodule", "add", remoteUrl, submodulePath], {
    stdio: "pipe",
  });
  if (res.status !== 0) {
    fail(`git submodule add failed: ${res.stderr.toString().trim()}`);
  }
  const result = {
    success: true,
    submodule_path: submodulePath,
    remote_url: remoteUrl,
    note: "Per-type paths not configured. Run: relic external set <type> <path>",
  };
  emit(result, text, () => {
    console.log(`Added submodule ${remoteUrl} at ${submodulePath}`);
    console.log(result.note);
  });
}

/* ── entry point ──────────────────────────────────────────────────────── */

export async function runExternal(options: ExternalOptions): Promise<void> {
  const relicDir = options.relicDir ?? findRelicDir(process.cwd());
  if (!relicDir) {
    console.error("Error: not in a Relic project. Run: relic init");
    process.exit(1);
  }

  const [sub, ...rest] = options.args;
  switch (sub) {
    case undefined:
      return runReport(relicDir, options.text);
    case "set":
      if (!rest[0]) fail("usage: relic external set <type> <path>");
      return runSet(relicDir, rest[0], rest[1], options.text);
    case "link":
      if (!rest[0]) fail("usage: relic external link <type>/<filename>");
      return runLink(relicDir, rest[0], options.spec, options.text);
    case "create":
      if (!rest[0]) fail('usage: relic external create <type> "<title>"');
      return runCreate(relicDir, rest[0], rest.slice(1), options.spec, options.text);
    case "list":
      return runList(relicDir, options.spec, options.text);
    case "init":
      if (!rest[0]) fail("usage: relic external init <remote-url> [--path <local-path>]");
      return runInitSubmodule(relicDir, rest[0], options.path, options.text);
    default:
      fail(`unknown sub-command "${sub}" — expected: set, link, create, list, or init`);
  }
}
