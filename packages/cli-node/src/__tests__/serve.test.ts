import { describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import {
  createViewerServer,
  resolveViewerRequest,
} from "../commands/serve.ts";

const fixture = join(
  import.meta.dir,
  "../../../core/src/__fixtures__/relic-2-project",
);

function request(path: string, method = "GET") {
  const response = resolveViewerRequest(fixture, "test-2.0", method, path);
  expect(response).toBeDefined();
  return response!;
}

function json<T>(path: string, method = "GET"): T {
  const response = request(path, method);
  expect(response.contentType).toContain("application/json");
  return JSON.parse(String(response.body)) as T;
}

function snapshot(root: string): Array<[string, string, number]> {
  const entries: Array<[string, string, number]> = [];
  const visit = (path: string) => {
    for (const name of readdirSync(path).sort()) {
      const child = join(path, name);
      const stat = statSync(child);
      if (stat.isDirectory()) {
        visit(child);
      } else {
        entries.push([
          relative(root, child),
          readFileSync(child).toString("base64"),
          stat.mtimeMs,
        ]);
      }
    }
  };
  visit(root);
  return entries;
}

describe("Relic 2.0 read-only viewer API", () => {
  test("reports the project identity without lifecycle state", () => {
    const response = request("/api/health");
    expect(response.status).toBe(200);
    expect(JSON.parse(String(response.body))).toEqual({
      relic: true,
      project: fixture,
      version: "test-2.0",
    });
  });

  test("exposes the exhaustive canonical catalog and diagnostics", () => {
    const body = json<{
      documents: Array<{ path: string }>;
      artifacts: Array<{ path: string }>;
      counts: { documents: number; artifacts: number; orphans: number };
    }>("/api/project");

    expect(body.documents.map((item) => item.path)).toContain(
      "knowledge/specs/002-orphan/index.html",
    );
    expect(body.documents.map((item) => item.path)).toContain(
      "knowledge/records/requirements/FR-001-login.md",
    );
    expect(body.artifacts.map((item) => item.path)).toEqual([
      "knowledge/specs/001-auth/notes.md",
    ]);
    expect(body.counts).toMatchObject({
      documents: 9,
      artifacts: 1,
      orphans: 3,
    });
  });

  test("addresses documents by path with relations and spec artifacts", () => {
    const path = encodeURIComponent("knowledge/specs/001-auth/index.html");
    const body = json<{
      document: {
        path: string;
        links: Array<{ status: string; targetPath?: string }>;
        backlinks: Array<{ sourcePath: string }>;
      };
      artifacts: Array<{ path: string }>;
      related: Array<{ path: string }>;
    }>(`/api/document?path=${path}`);

    expect(body.document.path).toBe("knowledge/specs/001-auth/index.html");
    expect(body.document.links.some((link) => link.status === "missing")).toBe(true);
    expect(body.document.backlinks.map((link) => link.sourcePath)).toContain(
      ".relic/RELIC.md",
    );
    expect(body.artifacts.map((artifact) => artifact.path)).toEqual([
      "knowledge/specs/001-auth/notes.md",
    ]);
    expect(body.related.map((document) => document.path)).toContain(
      "knowledge/records/requirements/FR-001-login.md",
    );
  });

  test("returns artifact search results with parent context, not document nodes", () => {
    const body = json<{
      results: Array<{
        type: string;
        path: string;
        specificationPaths?: string[];
      }>;
    }>("/api/search?q=legacy%20session");

    expect(body.results).toEqual([
      expect.objectContaining({
        type: "artifact",
        path: "knowledge/specs/001-auth/notes.md",
        specificationPaths: ["knowledge/specs/001-auth/index.html"],
      }),
    ]);
  });

  test("serves only discovered artifact content", () => {
    const known = request(
      `/api/content?path=${encodeURIComponent("knowledge/specs/001-auth/notes.md")}`,
    );
    expect(known.status).toBe(200);
    expect(String(known.body)).toContain("legacy session cookie");
    expect(known.contentType).toBe("application/octet-stream");
    expect(known.headers).toMatchObject({
      "Content-Disposition": 'attachment; filename="notes.md"',
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });

    expect(
      request(`/api/content?path=${encodeURIComponent("package.json")}`).status,
    ).toBe(404);
  });

  test("only serves passive raster artifacts inline", () => {
    const project = mkdtempSync(join(tmpdir(), "relic-artifacts-"));
    try {
      cpSync(fixture, project, { recursive: true });
      const spec = join(project, "knowledge/specs/001-auth");
      writeFileSync(join(spec, "diagram.svg"), '<svg onload="alert(1)"/>');
      writeFileSync(join(spec, "prototype.html"), "<script>alert(1)</script>");
      writeFileSync(join(spec, "pixel.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      const svg = resolveViewerRequest(
        project,
        "test-2.0",
        "GET",
        `/api/content?path=${encodeURIComponent("knowledge/specs/001-auth/diagram.svg")}`,
      )!;
      const html = resolveViewerRequest(
        project,
        "test-2.0",
        "GET",
        `/api/content?path=${encodeURIComponent("knowledge/specs/001-auth/prototype.html")}`,
      )!;
      const png = resolveViewerRequest(
        project,
        "test-2.0",
        "GET",
        `/api/content?path=${encodeURIComponent("knowledge/specs/001-auth/pixel.png")}`,
      )!;
      const pngDownload = resolveViewerRequest(
        project,
        "test-2.0",
        "GET",
        `/api/content?path=${encodeURIComponent("knowledge/specs/001-auth/pixel.png")}&download=1`,
      )!;

      for (const active of [svg, html]) {
        expect(active.contentType).toBe("application/octet-stream");
        expect(active.headers?.["Content-Disposition"]).toStartWith("attachment;");
      }
      expect(png.contentType).toBe("image/png");
      expect(png.headers?.["Content-Disposition"]).toBeUndefined();
      expect(pngDownload.contentType).toBe("application/octet-stream");
      expect(pngDownload.headers?.["Content-Disposition"]).toStartWith("attachment;");
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("sends artifact protections through the HTTP boundary", async () => {
    const server = createViewerServer(fixture, "test-2.0");
    await new Promise<void>((resolveListen, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolveListen);
    });

    try {
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("viewer test server did not bind a TCP port");
      }
      const artifact = await fetch(
        `http://127.0.0.1:${address.port}/api/content?path=${
          encodeURIComponent("knowledge/specs/001-auth/notes.md")
        }`,
      );
      expect(artifact.status).toBe(200);
      expect(artifact.headers.get("content-type")).toBe("application/octet-stream");
      expect(artifact.headers.get("content-disposition")).toBe(
        'attachment; filename="notes.md"',
      );
      expect(artifact.headers.get("content-security-policy")).toBe(
        "default-src 'none'; sandbox",
      );
      expect(artifact.headers.get("x-content-type-options")).toBe("nosniff");
      expect(artifact.headers.get("referrer-policy")).toBe("no-referrer");

      const shell = await fetch(`http://127.0.0.1:${address.port}/`);
      expect(shell.headers.get("content-security-policy")).toContain(
        "script-src 'self'",
      );
      expect(shell.headers.get("x-content-type-options")).toBe("nosniff");
    } finally {
      await new Promise<void>((resolveClose, reject) => {
        server.close((error) => error ? reject(error) : resolveClose());
      });
    }
  });

  test("rejects writes and unknown API resources", () => {
    expect(request("/api/project", "POST").status).toBe(405);
    expect(
      request(`/api/document?path=${encodeURIComponent("missing.md")}`).status,
    ).toBe(404);
    expect(request("/api/unknown").status).toBe(404);
  });

  test("stores no viewer or process state while serving the read model", () => {
    const before = snapshot(fixture);
    expect(request("/api/project").status).toBe(200);
    expect(request("/api/search?q=authentication").status).toBe(200);
    expect(snapshot(fixture)).toEqual(before);
  });
});
