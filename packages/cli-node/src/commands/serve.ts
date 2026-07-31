import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  readFileSync,
  realpathSync,
} from "node:fs";
import {
  basename,
  extname,
  relative,
  resolve,
  sep,
} from "node:path";

import {
  artifactView,
  documentView,
  loadKnowledgeProject,
  projectView,
  searchView,
  type KnowledgeProject,
} from "@relic/core";

import { VIEWER_ASSETS } from "../generated/viewer-assets.ts";
import { resolveRelicProjectDir } from "../project.ts";

export interface ServeOptions {
  port?: number;
  projectDir?: string;
  version?: string;
}

export interface ViewerResponse {
  status: number;
  contentType: string;
  body: string | Buffer;
  headers?: Record<string, string>;
}

const FIRST_AVAILABLE_PORT = 4747;
const AVAILABLE_PORT_ATTEMPTS = 100;
const PROJECT_CACHE_TTL_MS = 1_000;

type ProjectReader = () => KnowledgeProject;

const INLINE_ARTIFACT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const VIEWER_CSP = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

function attachmentName(path: string): string {
  const fallback = basename(path).replace(/[^\x20-\x7e]|["\\]/g, "_");
  return fallback || "artifact";
}

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

function artifactContent(
  projectDir: string,
  project: KnowledgeProject,
  path: string,
  forceDownload: boolean,
): ViewerResponse {
  if (!project.artifacts.some((artifact) => artifact.path === path)) {
    return jsonResponse(404, { error: `artifact "${path}" not found` });
  }

  try {
    const root = realpathSync(projectDir);
    const target = realpathSync(resolve(root, path));
    if (!isInside(root, target) || relative(root, target).split(sep).join("/") !== path) {
      return jsonResponse(404, { error: `artifact "${path}" not found` });
    }
    const inlineType = INLINE_ARTIFACT_TYPES[extname(target).toLowerCase()];
    const downloadable = forceDownload || inlineType === undefined;
    return {
      status: 200,
      contentType: downloadable ? "application/octet-stream" : inlineType,
      body: readFileSync(target),
      headers: {
        "Content-Security-Policy": "default-src 'none'; sandbox",
        ...(downloadable && {
          "Content-Disposition": `attachment; filename="${attachmentName(path)}"`,
        }),
      },
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
  readProject: ProjectReader = () => loadKnowledgeProject(projectDir),
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

  const project = readProject();
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
    return artifactContent(
      projectDir,
      project,
      url.searchParams.get("path") ?? "",
      url.searchParams.get("download") === "1",
    );
  }
  return jsonResponse(404, { error: "unknown API route" });
}

export function createProjectReader(
  projectDir: string,
  ttlMs = PROJECT_CACHE_TTL_MS,
  now: () => number = Date.now,
): ProjectReader {
  let cached: KnowledgeProject | undefined;
  let expiresAt = 0;
  return () => {
    const currentTime = now();
    if (cached === undefined || currentTime >= expiresAt) {
      cached = loadKnowledgeProject(projectDir);
      expiresAt = currentTime + ttlMs;
    }
    return cached;
  };
}

function send(
  res: ServerResponse,
  response: ViewerResponse,
  headOnly: boolean,
): void {
  res.writeHead(response.status, {
    "Content-Type": response.contentType,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...response.headers,
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
    "Content-Security-Policy": VIEWER_CSP,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(headOnly ? undefined : Buffer.from(asset.b64, "base64"));
  return true;
}

export function createViewerServer(projectDir: string, version: string) {
  const resolvedProjectDir = resolveRelicProjectDir(projectDir);
  const readProject = createProjectReader(resolvedProjectDir);
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    try {
      const method = req.method ?? "GET";
      const response = resolveViewerRequest(
        resolvedProjectDir,
        version,
        method,
        req.url ?? "/",
        readProject,
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

async function listen(
  projectDir: string,
  version: string,
  port: number,
) {
  const server = createViewerServer(projectDir, version);
  try {
    await new Promise<void>((resolveListen, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolveListen);
    });
    return server;
  } catch (error) {
    server.close();
    throw error;
  }
}

function isAddressInUse(error: unknown): boolean {
  return error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "EADDRINUSE";
}

export async function runServe(options: ServeOptions) {
  const projectDir = resolveRelicProjectDir(options.projectDir);

  const version = options.version ?? "dev";
  let server;
  if (options.port !== undefined) {
    server = await listen(projectDir, version, options.port);
  } else {
    for (
      let port = FIRST_AVAILABLE_PORT;
      port < FIRST_AVAILABLE_PORT + AVAILABLE_PORT_ATTEMPTS;
      port += 1
    ) {
      try {
        server = await listen(projectDir, version, port);
        break;
      } catch (error) {
        if (!isAddressInUse(error)) throw error;
      }
    }
    if (!server) {
      throw new Error(
        `No available localhost port from ${FIRST_AVAILABLE_PORT} to ${
          FIRST_AVAILABLE_PORT + AVAILABLE_PORT_ATTEMPTS - 1
        }`,
      );
    }
  }

  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`Relic knowledge viewer serving ${resolve(projectDir)}`);
  console.log(`  ${url}`);
  return server;
}
