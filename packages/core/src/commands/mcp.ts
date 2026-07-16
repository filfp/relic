/**
 * relic mcp — MCP server over stdio (spec 012, ViewerContract).
 *
 * Hand-rolled, zero-dependency (T-2 decision): newline-delimited JSON-RPC 2.0
 * per the MCP stdio transport (messages MUST NOT contain embedded newlines;
 * stdout carries only MCP messages; stderr is free for logs).
 *
 * Tool surface (tools only, D-4): view_spec / view_fix / list_views — each
 * ensures the per-project viewer server is running and returns the URL.
 */

import { spawn } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { findRelicDir, dirExists, fileExists, readViewerPort, availableSpecs } from "@relic/utility";
import { healthyInstance } from "./serve.ts";
import { parseSpecHeader } from "../core/view-data.ts";
import { readText } from "@relic/utility";

const PROTOCOL_FALLBACK = "2025-06-18";
const MAX_PORT_TRIES = 20;

interface RpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

function send(msg: unknown): void {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id: RpcRequest["id"], result: unknown): void {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id: RpcRequest["id"], code: number, message: string): void {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function toolText(text: string, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

const TOOLS = [
  {
    name: "view_spec",
    description:
      "Open a Relic spec in the browser-based spec viewer. Ensures the per-project viewer server is running and returns the URL to give the user.",
    inputSchema: {
      type: "object",
      properties: { spec_id: { type: "string", description: "Spec ID, e.g. 009-external-spec-integration" } },
      required: ["spec_id"],
    },
  },
  {
    name: "view_fix",
    description:
      "Open a Relic fix document in the spec viewer. Ensures the viewer server is running and returns the URL.",
    inputSchema: {
      type: "object",
      properties: { fix_id: { type: "string", description: "Fix ID, e.g. 2026-05-20-nav-links-inline-markdown-reader" } },
      required: ["fix_id"],
    },
  },
  {
    name: "list_views",
    description:
      "List all Relic specs and fixes with their viewer URLs (ensures the viewer server is running).",
    inputSchema: { type: "object", properties: {} },
  },
];

/** Find a healthy same-project instance, or spawn `relic serve` detached. */
// Concurrent tools/call requests (the normal MCP pattern) must share one
// probe-and-spawn cycle — two parallel ensureServer runs each see "no server"
// and spawn duplicate `relic serve` processes on auto-incremented ports.
let ensuring: Promise<number> | null = null;

function ensureServer(relicDir: string): Promise<number> {
  ensuring ??= doEnsureServer(relicDir).finally(() => {
    ensuring = null;
  });
  return ensuring;
}

async function doEnsureServer(relicDir: string): Promise<number> {
  const projectDir = join(relicDir, "..");
  const basePort = readViewerPort(relicDir);

  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    if (await healthyInstance(basePort + i, projectDir)) return basePort + i;
  }

  // spawn detached: compiled binary → execPath ["serve"]; dev/node bundle →
  // execPath [script, "serve"] when argv[1] is a real file on disk
  const script = process.argv[1];
  const args = script && existsSync(script) ? [script, "serve"] : ["serve"];
  const child = spawn(process.execPath, args, {
    cwd: projectDir,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 200));
    for (let i = 0; i < MAX_PORT_TRIES; i++) {
      if (await healthyInstance(basePort + i, projectDir)) return basePort + i;
    }
  }
  throw new Error("viewer server did not become healthy within 6s — try `relic serve` manually");
}

async function callTool(relicDir: string, name: string, args: Record<string, unknown>) {
  const specsDir = join(relicDir, "specs");

  if (name === "view_spec") {
    const specId = String(args["spec_id"] ?? "");
    if (!dirExists(join(specsDir, specId))) {
      const specs = availableSpecs(specsDir);
      return toolText(`Spec "${specId}" not found. Available: ${specs.join(", ")}`, true);
    }
    const port = await ensureServer(relicDir);
    const specMd = join(specsDir, specId, "spec.md");
    const header = parseSpecHeader(fileExists(specMd) ? readText(specMd) : null, specId);
    return toolText(
      `${header.title} (${header.status})\nhttp://localhost:${port}/spec/${specId}\n\nGive this URL to the user — the view renders live from .relic/ (fragment + derived task/artifact data + spec/plan/tasks tabs).`
    );
  }

  if (name === "view_fix") {
    const fixId = String(args["fix_id"] ?? "");
    const fixesDir = join(relicDir, "fixes");
    if (!fileExists(join(fixesDir, `${fixId}.html`)) && !fileExists(join(fixesDir, `${fixId}.md`))) {
      return toolText(`Fix "${fixId}" not found in .relic/fixes/`, true);
    }
    const port = await ensureServer(relicDir);
    return toolText(`http://localhost:${port}/fix/${fixId}`);
  }

  if (name === "list_views") {
    const port = await ensureServer(relicDir);
    const lines: string[] = [`Viewer: http://localhost:${port}/`];
    for (const id of availableSpecs(specsDir).sort()) {
      const specMd = join(specsDir, id, "spec.md");
      const header = parseSpecHeader(fileExists(specMd) ? readText(specMd) : null, id);
      lines.push(`- ${header.title} (${header.status}): http://localhost:${port}/spec/${id}`);
    }
    const fixesDir = join(relicDir, "fixes");
    if (dirExists(fixesDir)) {
      const fixes = readdirSync(fixesDir)
        .filter((f) => f.endsWith(".html") || (f.endsWith(".md") && f !== "manifest.toon"))
        .map((f) => f.replace(/\.(html|md)$/, ""));
      for (const id of [...new Set(fixes)].sort()) {
        lines.push(`- fix ${id}: http://localhost:${port}/fix/${id}`);
      }
    }
    return toolText(lines.join("\n"));
  }

  return toolText(`Unknown tool "${name}"`, true);
}

export async function runMcp(options: { relicDir?: string; version?: string }): Promise<void> {
  const relicDir = options.relicDir ?? findRelicDir(process.cwd());
  if (!relicDir) {
    process.stderr.write("relic mcp: not in a Relic project (no .relic/ found)\n");
    process.exit(1);
  }
  const version = options.version ?? "dev";
  const dir: string = relicDir; // narrowed — closures below capture a plain string

  let buffer = "";
  let pending = 0;
  let stdinClosed = false;
  const maybeExit = () => {
    if (stdinClosed && pending === 0) process.exit(0);
  };
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      pending++;
      void handleLine(line).finally(() => {
        pending--;
        maybeExit();
      });
    }
  });
  // drain in-flight tool calls before exiting on stdin close
  process.stdin.on("end", () => {
    stdinClosed = true;
    maybeExit();
  });

  async function handleLine(line: string): Promise<void> {
    let msg: RpcRequest;
    try {
      msg = JSON.parse(line) as RpcRequest;
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
      return;
    }
    const { id, method, params } = msg;

    try {
      if (method === "initialize") {
        const requested = (params?.["protocolVersion"] as string | undefined) ?? PROTOCOL_FALLBACK;
        reply(id, {
          protocolVersion: requested,
          capabilities: { tools: {} },
          serverInfo: { name: "relic", version },
        });
        return;
      }
      if (method === "notifications/initialized" || method?.startsWith("notifications/")) {
        return; // notifications get no response
      }
      if (method === "ping") {
        reply(id, {});
        return;
      }
      if (method === "tools/list") {
        reply(id, { tools: TOOLS });
        return;
      }
      if (method === "tools/call") {
        const name = String(params?.["name"] ?? "");
        const args = (params?.["arguments"] as Record<string, unknown>) ?? {};
        reply(id, await callTool(dir, name, args));
        return;
      }
      if (id !== undefined && id !== null) replyError(id, -32601, `method not found: ${method}`);
    } catch (err) {
      if (id !== undefined && id !== null) replyError(id, -32603, err instanceof Error ? err.message : String(err));
    }
  }
}
