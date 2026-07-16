import { execSync } from "child_process";
import { join } from "path";
import { findRelicDir, fileExists, dirExists, readJson, readSession, readMode, readSdd, readViewerPort, fetchWithTimeout } from "@relic/utility";
import { inferSpecFromBranch, availableSpecs } from "@relic/utility";
import {
  readExternalTypes,
  resolveExternalDir,
  resolveExternalRead,
  type ExternalType,
  type ResolvedExternalRead,
} from "@relic/utility";
import type { ArtifactsJson } from "../types.ts";

export interface ContextOptions {
  spec?: string;
  text?: boolean;
  relicDir?: string;
}

interface SharedArtifactRef {
  path: string;
  role: "owns" | "reads";
  exists: boolean;
}

type ExternalContextField =
  | { configured: false }
  | {
      configured: true;
      types: Partial<Record<ExternalType, { path: string; resolved_path: string; exists: boolean }>>;
    };

interface ExternalReadRef extends ResolvedExternalRead {
  error?: string;
}

interface ContextResult {
  relic_dir: string;
  spec_id: string;
  active_spec_source: "arg" | "env" | "session" | "git-branch";
  spec_dir: string;
  current_fix: string | null;
  mode: "md" | "html";
  sdd: "auto" | "suggest";
  viewer: { running: boolean; port: number; url: string | null };
  external: ExternalContextField;
  external_reads: ExternalReadRef[];
  files: {
    preamble: boolean;
    constitution: boolean;
    spec: boolean;
    plan: boolean;
    tasks: boolean;
    artifacts_json: boolean;
    changelog: boolean;
  };
  shared_artifacts: SharedArtifactRef[];
}

function resolveSpec(
  relicDir: string,
  specArg?: string
): { specId: string; source: ContextResult["active_spec_source"] } | null {
  // 1. --spec arg
  if (specArg) return { specId: specArg, source: "arg" };

  // 2. RELIC_SPEC env
  const envSpec = process.env["RELIC_SPEC"];
  if (envSpec) return { specId: envSpec, source: "env" };

  // 3. session.json
  const sessionSpec = readSession(relicDir).spec;
  if (sessionSpec) return { specId: sessionSpec, source: "session" };

  // 4. Git branch inference
  try {
    const branch = execSync("git branch --show-current", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const inferred = inferSpecFromBranch(branch);
    if (inferred) return { specId: inferred, source: "git-branch" };
  } catch {
    // not a git repo or git not available
  }

  return null;
}

export async function runContext(options: ContextOptions): Promise<void> {
  const relicDir = options.relicDir ?? findRelicDir(process.cwd());
  if (!relicDir) {
    console.error("Error: not in a Relic project. Run: relic init");
    process.exit(1);
  }

  const resolved = resolveSpec(relicDir, options.spec);
  if (!resolved) {
    const specs = availableSpecs(join(relicDir, "specs"));
    console.error("Error: could not resolve spec. Use --spec <id>, set RELIC_SPEC, or run: relic use <spec-id>");
    if (specs.length > 0) console.error("Available specs: " + specs.join(", "));
    process.exit(1);
  }

  const { specId, source } = resolved;
  const currentFix = readSession(relicDir).fix ?? null;
  const specDir = join(relicDir, "specs", specId);

  if (!dirExists(specDir)) {
    console.error(`Error: spec directory not found for "${specId}".`);
    console.error(`Run: relic scaffold --spec ${specId}`);
    process.exit(1);
  }

  const artifactsPath = join(specDir, "artifacts.json");

  // Check shared artifacts if artifacts.json exists
  const sharedArtifacts: SharedArtifactRef[] = [];
  const externalReads: ExternalReadRef[] = [];
  if (fileExists(artifactsPath)) {
    try {
      const art = readJson<ArtifactsJson & { external_reads?: string[] }>(artifactsPath);
      for (const p of art.owns) {
        sharedArtifacts.push({ path: p, role: "owns", exists: fileExists(join(relicDir, p)) });
      }
      for (const p of art.reads) {
        sharedArtifacts.push({ path: p, role: "reads", exists: fileExists(join(relicDir, p)) });
      }
      for (const entry of art.external_reads ?? []) {
        try {
          externalReads.push(resolveExternalRead(relicDir, entry));
        } catch (err) {
          externalReads.push({
            entry,
            type: (entry.split("/")[0] ?? "") as ExternalType,
            filename: entry.split("/").slice(1).join("/"),
            resolved_path: "",
            exists: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch {
      // malformed artifacts.json — skip artifact refs
    }
  }

  // Viewer state (spec 012): probe the port recorded by the running server
  // (viewer.json — it auto-increments when the configured port is taken)
  // before falling back to the configured port.
  const configuredPort = readViewerPort(relicDir);
  const candidatePorts = [configuredPort];
  try {
    const lifecycle = readJson<{ port?: number }>(join(relicDir, "viewer.json"));
    if (typeof lifecycle.port === "number" && lifecycle.port !== configuredPort) {
      candidatePorts.unshift(lifecycle.port);
    }
  } catch {
    // no lifecycle file — configured port only
  }
  let viewerPort = configuredPort;
  let viewerRunning = false;
  for (const port of candidatePorts) {
    try {
      const res = await fetchWithTimeout(`http://127.0.0.1:${port}/api/health`, 300);
      if (res.ok) {
        const body = (await res.json()) as { relic?: boolean; project?: string };
        if (body.relic === true && body.project === join(relicDir, "..")) {
          viewerRunning = true;
          viewerPort = port;
          break;
        }
      }
    } catch {
      // not running on this port — try the next candidate
    }
  }

  // External per-type config (ExternalConfigContract §3)
  const configuredTypes = readExternalTypes(relicDir);
  const configuredKeys = Object.keys(configuredTypes) as ExternalType[];
  const external: ExternalContextField =
    configuredKeys.length === 0
      ? { configured: false }
      : {
          configured: true,
          types: Object.fromEntries(
            configuredKeys.map((t) => {
              const resolvedDir = resolveExternalDir(relicDir, t)!;
              return [t, { path: configuredTypes[t]!, resolved_path: resolvedDir, exists: dirExists(resolvedDir) }];
            })
          ),
        };

  const result: ContextResult = {
    relic_dir: relicDir,
    spec_id: specId,
    active_spec_source: source,
    spec_dir: specDir,
    current_fix: currentFix,
    mode: readMode(relicDir),
    sdd: readSdd(relicDir),
    viewer: { running: viewerRunning, port: viewerPort, url: viewerRunning ? `http://localhost:${viewerPort}` : null },
    external,
    external_reads: externalReads,
    files: {
      preamble: fileExists(join(relicDir, "preamble.md")),
      constitution: fileExists(join(relicDir, "constitution.md")),
      spec: fileExists(join(specDir, "spec.md")),
      plan: fileExists(join(specDir, "plan.md")),
      tasks: fileExists(join(specDir, "tasks.md")),
      artifacts_json: fileExists(artifactsPath),
      changelog: fileExists(join(relicDir, "changelog.md")),
    },
    shared_artifacts: sharedArtifacts,
  };

  if (options.text) {
    console.log(`Spec:    ${specId}  (resolved from: ${source})`);
    console.log(`Fix:     ${currentFix ?? "(none)"}`);
    console.log(`Mode:    ${result.mode}`);
    console.log(`SDD:     ${result.sdd}`);
    console.log(`Viewer:  ${result.viewer.running ? result.viewer.url : `not running (port ${result.viewer.port})`}`);
    console.log(`Dir:     ${specDir}`);
    console.log(`Relic:   ${relicDir}`);
    console.log("");
    console.log("Files:");
    for (const [key, exists] of Object.entries(result.files)) {
      console.log(`  ${exists ? "✓" : "✗"} ${key}`);
    }
    if (sharedArtifacts.length > 0) {
      console.log("");
      console.log("Shared artifacts:");
      for (const a of sharedArtifacts) {
        console.log(`  [${a.role}] ${a.path}  ${a.exists ? "(exists)" : "(MISSING)"}`);
      }
    }
    if (external.configured) {
      console.log("");
      console.log("External types:");
      for (const [t, info] of Object.entries(external.types)) {
        console.log(`  ${t}: ${info.path}  ${info.exists ? "(exists)" : "(MISSING)"}`);
      }
    }
    if (externalReads.length > 0) {
      console.log("");
      console.log("External reads:");
      for (const r of externalReads) {
        console.log(`  ${r.exists ? "✓" : "✗"} ${r.entry}${r.error ? `  (${r.error})` : ""}`);
      }
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}
