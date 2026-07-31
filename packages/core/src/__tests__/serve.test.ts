import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { resolveViewerRequest } from "../commands/serve.ts";

const fixture = join(import.meta.dir, "../__fixtures__/relic-2-project");

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

    expect(
      request(`/api/content?path=${encodeURIComponent("package.json")}`).status,
    ).toBe(404);
  });

  test("rejects writes and unknown API resources", () => {
    expect(request("/api/project", "POST").status).toBe(405);
    expect(
      request(`/api/document?path=${encodeURIComponent("missing.md")}`).status,
    ).toBe(404);
    expect(request("/api/unknown").status).toBe(404);
  });
});
