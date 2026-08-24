import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import {
  loadFederatedKnowledgeProject,
} from "@relic/core";

import {
  createViewerServer,
  createProjectReader,
  resolveViewerRequest,
  runServe,
} from "../commands/serve.ts";

const fixture = join(
  import.meta.dir,
  "../../../core/src/__fixtures__/relic-2-project",
);
const temporaryDirectories: string[] = [];

function createTemporaryProject(): string {
  const root = mkdtempSync(join(tmpdir(), "relic-serve-federation-"));
  temporaryDirectories.push(root);
  return root;
}

function writeViewerProject(
  directory: string,
  label: string,
  members: Record<string, string> = {},
): void {
  mkdirSync(join(directory, "knowledge/specs/001-same"), { recursive: true });
  mkdirSync(join(directory, "knowledge/shared"), { recursive: true });
  mkdirSync(join(directory, "knowledge/notes"), { recursive: true });
  writeFileSync(
    join(directory, "knowledge/specs/001-same/index.html"),
    `<relic-body id="001-same"><h1>${label} specification</h1></relic-body>\n`,
  );
  writeFileSync(
    join(directory, "knowledge/specs/001-same/evidence.txt"),
    `${label} artifact evidence\n`,
  );
  writeFileSync(
    join(directory, "knowledge/notes/NOTE-001-same.md"),
    `---\nid: NOTE-001\n---\n\n# ${label} note\n`,
  );
  const federation = Object.keys(members).length === 0
    ? ""
    : `federation:\n  members:\n${Object.entries(members)
      .map(([key, path]) => `    ${key}: ${path}\n`)
      .join("")}`;
  writeFileSync(
    join(directory, "relic.yaml"),
    `topology:\n  specs: knowledge/specs\n  shared: knowledge/shared\n  records:\n    note: knowledge/notes\n${federation}`,
  );
}

function federatedRequest(root: string, path: string, method = "GET") {
  const response = resolveViewerRequest(root, "test-2.0", method, path);
  expect(response).toBeDefined();
  return response!;
}

function federatedJson<T>(root: string, path: string): T {
  const response = federatedRequest(root, path);
  expect(response.contentType).toContain("application/json");
  return JSON.parse(String(response.body)) as T;
}

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

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

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
      documents: 10,
      artifacts: 1,
      orphans: 5,
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
    expect(body.document.backlinks.map((link) => link.sourcePath)).not.toContain(
      "relic.yaml",
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

  test("exposes a federated project envelope without member filesystem roots", () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeViewerProject(backend, "Backend");
    writeViewerProject(root, "Root", { backend: "backend" });

    const response = federatedRequest(root, "/api/project");
    const body = JSON.parse(String(response.body)) as {
      documents: Array<{ project: string[]; path: string }>;
      artifacts: Array<{ project: string[]; path: string }>;
      federation: {
        projects: Array<{ address: string[] }>;
        edges: Array<{ parent: string[]; child?: string[]; status: string }>;
      };
    };

    expect(body.documents.filter((document) =>
      document.path === "knowledge/notes/NOTE-001-same.md"
    ).map((document) => document.project.join("/"))).toEqual([
      "root",
      "root/backend",
    ]);
    expect(body.artifacts.filter((artifact) =>
      artifact.path === "knowledge/specs/001-same/evidence.txt"
    ).map((artifact) => artifact.project.join("/"))).toEqual([
      "root",
      "root/backend",
    ]);
    expect(body.federation.projects.map((project) => project.address.join("/")))
      .toEqual(["root", "root/backend"]);
    expect(body.federation.edges).toContainEqual(expect.objectContaining({
      parent: ["root"],
      child: ["root", "backend"],
      status: "valid",
    }));
    expect(String(response.body)).not.toContain(backend);
  });

  test("routes federated documents, relationships, artifacts, and search by address", () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeViewerProject(backend, "Backend");
    writeViewerProject(root, "Root", { backend: "backend" });
    writeFileSync(
      join(root, "knowledge/notes/NOTE-001-same.md"),
      "---\nid: NOTE-001\n---\n\n# Root note\n\n[Backend note](../../backend/knowledge/notes/NOTE-001-same.md)\n",
    );
    const notePath = encodeURIComponent("knowledge/notes/NOTE-001-same.md");
    const artifactPath = encodeURIComponent(
      "knowledge/specs/001-same/evidence.txt",
    );

    const rootNote = federatedJson<{
      document: {
        project: string[];
        links: Array<{ status: string; target?: { project: string[]; path: string } }>;
      };
      related: Array<{ project: string[]; path: string }>;
    }>(root, `/api/document?project=root&path=${notePath}`);
    const backendNote = federatedJson<{
      document: {
        project: string[];
        backlinks: Array<{ source: { project: string[]; path: string } }>;
      };
    }>(root, `/api/document?project=root%2Fbackend&path=${notePath}`);
    const artifact = federatedJson<{
      artifact: { project: string[]; specifications: Array<{ project: string[] }> };
      parents: Array<{ project: string[]; path: string }>;
    }>(root, `/api/artifact?project=root%2Fbackend&path=${artifactPath}`);
    const search = federatedJson<{
      results: Array<{ project: string[]; path: string }>;
    }>(root, "/api/search?q=note");

    expect(rootNote.document.links[0]).toMatchObject({
      status: "canonical",
      target: {
        project: ["root", "backend"],
        path: "knowledge/notes/NOTE-001-same.md",
      },
    });
    expect(rootNote.related).toContainEqual(expect.objectContaining({
      project: ["root", "backend"],
      path: "knowledge/notes/NOTE-001-same.md",
    }));
    expect(backendNote.document.backlinks).toContainEqual(expect.objectContaining({
      source: {
        project: ["root"],
        path: "knowledge/notes/NOTE-001-same.md",
      },
    }));
    expect(artifact.artifact).toMatchObject({
      project: ["root", "backend"],
      specifications: [{ project: ["root", "backend"] }],
    });
    expect(artifact.parents).toContainEqual(expect.objectContaining({
      project: ["root", "backend"],
      path: "knowledge/specs/001-same/index.html",
    }));
    expect(search.results.filter((result) =>
      result.path === "knowledge/notes/NOTE-001-same.md"
    ).map((result) => result.project.join("/"))).toEqual([
      "root",
      "root/backend",
    ]);
  });

  test("serves artifact content only through a validated project address", () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeViewerProject(backend, "Backend");
    writeViewerProject(root, "Root", { backend: "backend" });
    const artifactPath = encodeURIComponent(
      "knowledge/specs/001-same/evidence.txt",
    );

    const rootContent = federatedRequest(
      root,
      `/api/content?project=root&path=${artifactPath}`,
    );
    const backendContent = federatedRequest(
      root,
      `/api/content?project=root%2Fbackend&path=${artifactPath}`,
    );

    expect(String(rootContent.body)).toBe("Root artifact evidence\n");
    expect(String(backendContent.body)).toBe("Backend artifact evidence\n");
    for (const invalidProject of [
      "root/missing",
      "root//backend",
      "root/Backend",
      "../backend",
      "/backend",
    ]) {
      expect(federatedRequest(
        root,
        `/api/content?project=${encodeURIComponent(invalidProject)}&path=${artifactPath}`,
      ).status).toBe(404);
    }
    expect(federatedRequest(
      root,
      `/api/content?project=root%2Fbackend&path=${encodeURIComponent("../relic.yaml")}`,
    ).status).toBe(404);
  });

  test("rebuilds the reachable federation graph after cache expiry", () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeViewerProject(backend, "Backend");
    writeViewerProject(root, "Root");
    let time = 1_000;
    const reader = createProjectReader(root, 500, () => time);

    const first = reader();
    expect(first.projects.map((project) => project.address.join("/"))).toEqual([
      "root",
    ]);
    writeViewerProject(root, "Root", { backend: "backend" });
    expect(reader()).toBe(first);

    time += 501;
    expect(reader().projects.map((project) => project.address.join("/"))).toEqual([
      "root",
      "root/backend",
    ]);
  });

  test("serves valid member knowledge when the root topology is invalid", () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeViewerProject(backend, "Backend");
    writeFileSync(
      join(root, "relic.yaml"),
      "topology:\n  specs: ../../outside\nfederation:\n  members:\n    backend: backend\n",
    );

    const project = federatedRequest(root, "/api/project");
    const projectBody = JSON.parse(String(project.body)) as {
      documents: Array<{ project: string[] }>;
      diagnostics: Array<{
        project: string[];
        diagnostic: { code: string };
      }>;
    };
    const search = federatedJson<{
      results: Array<{ project: string[]; path: string }>;
    }>(root, "/api/search?q=Backend");

    expect(project.status).toBe(200);
    expect(projectBody.documents.every((document) =>
      document.project.join("/") === "root/backend"
    )).toBe(true);
    expect(projectBody.diagnostics).toContainEqual(expect.objectContaining({
      project: ["root"],
      diagnostic: expect.objectContaining({ code: "invalid-topology" }),
    }));
    expect(search.results).toContainEqual(expect.objectContaining({
      project: ["root", "backend"],
      path: "knowledge/notes/NOTE-001-same.md",
    }));
  });

  test("round-trips a nested hierarchical project address", () => {
    const root = createTemporaryProject();
    const product = join(root, "product");
    const api = join(product, "api");
    mkdirSync(api, { recursive: true });
    writeViewerProject(api, "API");
    writeViewerProject(product, "Product", { api: "api" });
    writeViewerProject(root, "Root", { product: "product" });
    const path = encodeURIComponent("knowledge/notes/NOTE-001-same.md");

    const body = federatedJson<{ document: { project: string[]; path: string } }>(
      root,
      `/api/document?project=root%2Fproduct%2Fapi&path=${path}`,
    );

    expect(body.document).toMatchObject({
      project: ["root", "product", "api"],
      path: "knowledge/notes/NOTE-001-same.md",
    });
  });

  test("fails before binding when no safe topology is reachable", async () => {
    const root = createTemporaryProject();
    writeFileSync(
      join(root, "relic.yaml"),
      "topology:\n  specs: ../../outside\n",
    );

    await expect(runServe({
      projectDir: root,
      port: 65_534,
      version: "test-2.0",
    })).rejects.toThrow(/Relic topology is unavailable/);
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

  test("reuses one derived read model inside the cache window", () => {
    let time = 1_000;
    const readProject = createProjectReader(fixture, 500, () => time);
    const first = readProject();
    expect(readProject()).toBe(first);

    time += 501;
    expect(readProject()).not.toBe(first);
  });

  test("loads the corpus only once when serving artifact content", () => {
    const project = loadFederatedKnowledgeProject(fixture);
    let reads = 0;
    const response = resolveViewerRequest(
      fixture,
      "test-2.0",
      "GET",
      `/api/content?path=${encodeURIComponent("knowledge/specs/001-auth/notes.md")}`,
      () => {
        reads += 1;
        return project;
      },
    );

    expect(response?.status).toBe(200);
    expect(reads).toBe(1);
  });

  test("refuses to start for a directory without relic.yaml", () => {
    const legacy = mkdtempSync(join(tmpdir(), "relic-serve-legacy-"));
    try {
      mkdirSync(join(legacy, ".relic"));
      expect(() => createViewerServer(legacy, "test-2.0")).toThrow(
        /Missing relic\.yaml/,
      );
    } finally {
      rmSync(legacy, { recursive: true, force: true });
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
