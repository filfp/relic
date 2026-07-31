import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  readFileSync,
  realpathSync,
} from "node:fs";
import {
  dirname,
  extname,
  relative,
  resolve,
  sep,
} from "node:path";

import { fetchWithTimeout, findRelicDir } from "@relic/utility";

import { VIEWER_ASSETS } from "../generated/viewer-assets.ts";
import {
  artifactView,
  documentView,
  loadKnowledgeProject,
  projectView,
  searchView,
} from "../knowledge/index.ts";

export interface ServeOptions {
  port?: number;
  text?: boolean;
  projectDir?: string;
  version?: string;
}

export interface ViewerResponse {
  status: number;
  contentType: string;
  body: string | Buffer;
}

const DEFAULT_VIEWER_PORT = 4747;

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function jsonResponse(status: number, body: unknown): ViewerResponse {
  return {
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  };
}

function isInside(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}${sep}`);
}

function artifactContent(projectDir: string, path: string): ViewerResponse {
  const project = loadKnowledgeProject(projectDir);
  if (!project.artifacts.some((artifact) => artifact.path === path)) {
    return jsonResponse(404, { error: `artifact "${path}" not found` });
  }

  try {
    const root = realpathSync(projectDir);
    const target = realpathSync(resolve(root, path));
    if (!isInside(root, target) || relative(root, target).split(sep).join("/") !== path) {
      return jsonResponse(404, { error: `artifact "${path}" not found` });
    }
    return {
      status: 200,
      contentType: CONTENT_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
      body: readFileSync(target),
    };
  } catch {
    return jsonResponse(404, { error: `artifact "${path}" not found` });
  }
}

export function resolveViewerRequest(
  projectDir: string,
  version: string,
  method: string,
  requestUrl: string,
): ViewerResponse | undefined {
  if (method !== "GET" && method !== "HEAD") {
    return jsonResponse(405, { error: "read-only server — GET and HEAD only" });
  }

  const url = new URL(requestUrl, "http://localhost");
  if (!url.pathname.startsWith("/api/")) return undefined;

  if (url.pathname === "/api/health") {
    return jsonResponse(200, {
      relic: true,
      project: resolve(projectDir),
      version,
    });
  }

  const project = loadKnowledgeProject(projectDir);
  if (url.pathname === "/api/project") {
    return jsonResponse(200, projectView(projectDir, project));
  }
  if (url.pathname === "/api/document") {
    const path = url.searchParams.get("path") ?? "";
    const view = documentView(project, path);
    return view
      ? jsonResponse(200, view)
      : jsonResponse(404, { error: `document "${path}" not found` });
  }
  if (url.pathname === "/api/artifact") {
    const path = url.searchParams.get("path") ?? "";
    const view = artifactView(project, path);
    return view
      ? jsonResponse(200, view)
      : jsonResponse(404, { error: `artifact "${path}" not found` });
  }
  if (url.pathname === "/api/search") {
    return jsonResponse(200, {
      query: url.searchParams.get("q") ?? "",
      results: searchView(project, url.searchParams.get("q") ?? ""),
    });
  }
  if (url.pathname === "/api/content") {
    return artifactContent(projectDir, url.searchParams.get("path") ?? "");
  }
  return jsonResponse(404, { error: "unknown API route" });
}

function send(
  res: ServerResponse,
  response: ViewerResponse,
  headOnly: boolean,
): void {
  res.writeHead(response.status, {
    "Content-Type": response.contentType,
    "Cache-Control": "no-store",
  });
  res.end(headOnly ? undefined : response.body);
}

function serveAsset(res: ServerResponse, key: string, headOnly: boolean): boolean {
  const asset = VIEWER_ASSETS[key];
  if (!asset) return false;
  res.writeHead(200, {
    "Content-Type": asset.type,
    "Cache-Control": key === "index.html"
      ? "no-cache"
      : "public, max-age=31536000, immutable",
  });
  res.end(headOnly ? undefined : Buffer.from(asset.b64, "base64"));
  return true;
}

export function createViewerServer(projectDir: string, version: string) {
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    try {
      const method = req.method ?? "GET";
      const response = resolveViewerRequest(
        projectDir,
        version,
        method,
        req.url ?? "/",
      );
      if (response) {
        send(res, response, method === "HEAD");
        return;
      }

      const url = new URL(req.url ?? "/", "http://localhost");
      const path = decodeURIComponent(url.pathname);
      const key = path === "/" ? "index.html" : path.slice(1);
      if (serveAsset(res, key, method === "HEAD")) return;
      if (serveAsset(res, "index.html", method === "HEAD")) return;
      send(
        res,
        jsonResponse(503, {
          error: "viewer assets not embedded — run: bun run build:viewer",
        }),
        method === "HEAD",
      );
    } catch (error) {
      send(
        res,
        jsonResponse(500, {
          error: error instanceof Error ? error.message : String(error),
        }),
        req.method === "HEAD",
      );
    }
  });
}

/** Legacy MCP probe retained until the explicitly deferred 1.x retirement stage. */
export async function healthyInstance(
  port: number,
  projectDir: string,
): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `http://127.0.0.1:${port}/api/health`,
      500,
    );
    if (!response.ok) return false;
    const body = await response.json() as { relic?: boolean; project?: string };
    return body.relic === true && body.project === resolve(projectDir);
  } catch {
    return false;
  }
}

export async function runServe(options: ServeOptions): Promise<void> {
  let projectDir = options.projectDir;
  if (!projectDir) {
    const relicDir = findRelicDir(process.cwd());
    if (relicDir) projectDir = dirname(relicDir);
  }
  if (!projectDir) {
    console.error("Error: not in a Relic project. Run: relic init");
    process.exitCode = 1;
    return;
  }

  const port = options.port ?? DEFAULT_VIEWER_PORT;
  const version = options.version ?? "dev";
  const server = createViewerServer(projectDir, version);

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolveListen);
  });

  const url = `http://127.0.0.1:${port}`;
  if (options.text) {
    console.log(`Relic knowledge viewer serving ${resolve(projectDir)}`);
    console.log(`  ${url}`);
  } else {
    console.log(JSON.stringify({ url, port, project: resolve(projectDir) }, null, 2));
  }
}
