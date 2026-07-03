/**
 * relic serve — the spec viewer server (spec 012, ViewerContract).
 *
 * Per-project, localhost-only, strictly READ-ONLY (GET/HEAD): serves the
 * embedded viewer app at `/` (SPA fallback for client routes) and a JSON API
 * that reads .relic/ live per request. The CLI remains the only writer.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { join } from "path";
import { appendFileSync } from "fs";
import {
  findRelicDir,
  fileExists,
  readText,
  writeJson,
  readViewerPort,
  fetchWithTimeout,
} from "@relic/utility";
import { VIEWER_ASSETS } from "../generated/viewer-assets.ts";
import { projectInfo, specDetail, fixDetail } from "../core/view-data.ts";

export interface ServeOptions {
  port?: number;
  text?: boolean;
  relicDir?: string;
  version?: string;
}

const MAX_PORT_TRIES = 20;

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(payload);
}

function serveAsset(res: ServerResponse, key: string): boolean {
  const asset = VIEWER_ASSETS[key];
  if (!asset) return false;
  res.writeHead(200, {
    "Content-Type": asset.type,
    "Cache-Control": key === "index.html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  res.end(Buffer.from(asset.b64, "base64"));
  return true;
}

export function createViewerServer(relicDir: string, version: string) {
  const projectDir = join(relicDir, "..");

  return createServer((req: IncomingMessage, res: ServerResponse) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        json(res, 405, { error: "read-only server — GET only" });
        return;
      }
      const url = new URL(req.url ?? "/", "http://localhost");
      const path = decodeURIComponent(url.pathname);

      if (path === "/api/health") {
        json(res, 200, { relic: true, project: projectDir, version });
        return;
      }
      if (path === "/api/project") {
        json(res, 200, projectInfo(relicDir));
        return;
      }
      const specMatch = path.match(/^\/api\/spec\/([A-Za-z0-9._-]+)$/);
      if (specMatch) {
        const detail = specDetail(relicDir, specMatch[1]!);
        if (detail) json(res, 200, detail);
        else json(res, 404, { error: `spec "${specMatch[1]}" not found` });
        return;
      }
      const fixMatch = path.match(/^\/api\/fix\/([A-Za-z0-9._-]+)$/);
      if (fixMatch) {
        const detail = fixDetail(relicDir, fixMatch[1]!);
        if (detail) json(res, 200, detail);
        else json(res, 404, { error: `fix "${fixMatch[1]}" not found` });
        return;
      }
      if (path.startsWith("/api/")) {
        json(res, 404, { error: "unknown API route" });
        return;
      }

      // static assets, then SPA fallback for client routes
      const key = path === "/" ? "index.html" : path.slice(1);
      if (serveAsset(res, key)) return;
      if (serveAsset(res, "index.html")) return;
      json(res, 503, { error: "viewer assets not embedded — run: bun run build:viewer" });
    } catch (err) {
      json(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  });
}

/** Health-check a port: is it OUR viewer for THIS project? */
export async function healthyInstance(port: number, projectDir: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`http://127.0.0.1:${port}/api/health`, 500);
    if (!res.ok) return false;
    const body = (await res.json()) as { relic?: boolean; project?: string };
    return body.relic === true && body.project === projectDir;
  } catch {
    return false;
  }
}

function recordLifecycle(relicDir: string, port: number): void {
  writeJson(join(relicDir, "viewer.json"), {
    port,
    pid: process.pid,
    started_at: new Date().toISOString(),
  });
  // ensure the lifecycle file stays out of version control (older projects
  // predate this entry; init writes it for new ones)
  const gitignorePath = join(relicDir, ".gitignore");
  const current = fileExists(gitignorePath) ? readText(gitignorePath) : "";
  if (!current.split("\n").includes("viewer.json")) {
    appendFileSync(gitignorePath, (current.endsWith("\n") || current === "" ? "" : "\n") + "viewer.json\n");
  }
}

export async function runServe(options: ServeOptions): Promise<void> {
  const relicDir = options.relicDir ?? findRelicDir(process.cwd());
  if (!relicDir) {
    console.error("Error: not in a Relic project. Run: relic init");
    process.exit(1);
  }
  const projectDir = join(relicDir, "..");
  const version = options.version ?? "dev";
  const basePort = options.port ?? readViewerPort(relicDir);

  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    const port = basePort + i;
    // same-project instance already up → reuse
    if (await healthyInstance(port, projectDir)) {
      const url = `http://localhost:${port}`;
      if (options.text) console.log(`Viewer already running for this project: ${url}`);
      else console.log(JSON.stringify({ url, port, reused: true }, null, 2));
      return;
    }
    const server = createViewerServer(relicDir, version);
    const ok = await new Promise<boolean>((resolve) => {
      server.once("error", (err: NodeJS.ErrnoException) => {
        resolve(err.code === "EADDRINUSE" ? false : (console.error(`Error: ${err.message}`), process.exit(1)));
      });
      server.listen(port, "127.0.0.1", () => resolve(true));
    });
    if (!ok) continue; // busy with something else — try the next port

    recordLifecycle(relicDir, port);
    const url = `http://localhost:${port}`;
    if (options.text) {
      console.log(`Relic spec viewer serving ${projectDir}`);
      console.log(`  ${url}`);
    } else {
      console.log(JSON.stringify({ url, port, reused: false }, null, 2));
    }
    return; // keep the process alive — server is listening
  }

  console.error(`Error: no free port found in ${basePort}-${basePort + MAX_PORT_TRIES - 1}`);
  process.exit(1);
}
