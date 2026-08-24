import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadFederatedKnowledgeProject,
  searchFederatedKnowledge,
} from "../knowledge/index.ts";

const temporaryDirectories: string[] = [];
const VALID_TOPOLOGY =
  "topology:\n  specs: .relic/specs\n  shared: .relic/shared\n  records: {}\n";

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "relic-federation-"));
  temporaryDirectories.push(root);
  return root;
}

function projectDirectory(root: string, path: string): string {
  const directory = join(root, path);
  mkdirSync(directory, { recursive: true });
  return directory;
}

function writeRelic(
  directory: string,
  members: Record<string, string> = {},
  topology = VALID_TOPOLOGY,
): void {
  const federation = Object.keys(members).length === 0
    ? ""
    : `federation:\n  members:\n${Object.entries(members)
      .map(([key, path]) => `    ${key}: ${path}\n`)
      .join("")}`;
  writeFileSync(join(directory, "relic.yaml"), `${topology}${federation}`, "utf8");
}

function writeKnowledgeProject(
  directory: string,
  members: Record<string, string> = {},
): void {
  const specs = projectDirectory(directory, "knowledge/specs/001-same");
  const notes = projectDirectory(directory, "knowledge/notes");
  projectDirectory(directory, "knowledge/shared");
  writeFileSync(
    join(specs, "index.html"),
    '<relic-body id="001-same"><h1>Same specification</h1></relic-body>\n',
    "utf8",
  );
  writeFileSync(join(specs, "evidence.txt"), "same evidence\n", "utf8");
  writeFileSync(
    join(notes, "NOTE-001-same.md"),
    "---\nid: NOTE-001\n---\n\n# Same note\n",
    "utf8",
  );
  writeRelic(
    directory,
    members,
    "topology:\n  specs: knowledge/specs\n  shared: knowledge/shared\n  records:\n    note: knowledge/notes\n",
  );
}

function writeNote(directory: string, body: string): void {
  writeFileSync(
    join(directory, "knowledge/notes/NOTE-001-same.md"),
    `---\nid: NOTE-001\n---\n\n# Same note\n\n${body}\n`,
    "utf8",
  );
}

function addresses(projectPath: string): string[] {
  return loadFederatedKnowledgeProject(projectPath).projects.map((node) =>
    node.address.join("/")
  );
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("Relic hierarchical federation", () => {
  test("traverses only explicit descendants from the selected boundary", () => {
    const root = createRoot();
    const product = projectDirectory(root, "product");
    const api = projectDirectory(product, "packages/api");
    const undeclared = projectDirectory(root, "vendor/undeclared");
    writeRelic(api);
    writeRelic(product, { api: "packages/api" });
    writeRelic(undeclared);
    writeRelic(root, { product: "product" });

    const aggregate = loadFederatedKnowledgeProject(root);

    expect(aggregate.projects.map((node) => node.address.join("/"))).toEqual([
      "root",
      "root/product",
      "root/product/api",
    ]);
    expect(aggregate.edges.map((edge) => ({
      parent: edge.parent.join("/"),
      key: edge.key,
      child: edge.child?.join("/"),
      status: edge.status,
    }))).toEqual([
      {
        parent: "root",
        key: "product",
        child: "root/product",
        status: "valid",
      },
      {
        parent: "root/product",
        key: "api",
        child: "root/product/api",
        status: "valid",
      },
    ]);
    expect(addresses(product)).toEqual(["root", "root/api"]);
    expect(addresses(api)).toEqual(["root"]);
  });

  test("keeps valid descendants available when the selected topology is invalid", () => {
    const root = createRoot();
    const backend = projectDirectory(root, "backend");
    writeKnowledgeProject(backend);
    writeRelic(
      root,
      { backend: "backend" },
      "topology:\n  specs: ../../outside\n",
    );

    const aggregate = loadFederatedKnowledgeProject(root);

    expect(aggregate.projects.map((node) => node.address.join("/"))).toEqual([
      "root",
      "root/backend",
    ]);
    expect(aggregate.projects[0]?.knowledge.topology).toBeUndefined();
    expect(aggregate.projects[1]?.knowledge.topology).toBeDefined();
    expect(aggregate.documents.length).toBeGreaterThan(0);
    expect(aggregate.documents.every(({ project }) =>
      project.join("/") === "root/backend"
    )).toBe(true);
    expect(searchFederatedKnowledge(aggregate, "NOTE-001").map((result) =>
      result.project.join("/")
    )).toEqual(["root/backend"]);
    expect(aggregate.diagnostics).toContainEqual(
      expect.objectContaining({
        project: ["root"],
        diagnostic: expect.objectContaining({ code: "invalid-topology" }),
      }),
    );
  });

  test("traverses through a reached member whose local topology is invalid", () => {
    const root = createRoot();
    const product = projectDirectory(root, "product");
    const api = projectDirectory(product, "api");
    writeRelic(api);
    writeRelic(
      product,
      { api: "api" },
      "topology:\n  specs: ../../outside\n",
    );
    writeRelic(root, { product: "product" });

    const aggregate = loadFederatedKnowledgeProject(root);

    expect(aggregate.projects.map((node) => node.address.join("/"))).toEqual([
      "root",
      "root/product",
      "root/product/api",
    ]);
    expect(aggregate.projects[1]?.knowledge.topology).toBeUndefined();
    expect(aggregate.projects[2]?.knowledge.topology).toBeDefined();
  });

  test("retains invalid declarations as localized edge evidence", () => {
    const root = createRoot();
    const backend = projectDirectory(root, "backend");
    writeRelic(backend);
    writeRelic(root, {
      backend: "backend",
      root: "backend",
      Missing_Key: "backend",
      missing: "missing",
      self: ".",
    });

    const aggregate = loadFederatedKnowledgeProject(root);
    const statusByKey = Object.fromEntries(
      aggregate.edges.map((edge) => [edge.key, edge.status]),
    );

    expect(statusByKey).toEqual({
      backend: "valid",
      missing: "invalid",
      Missing_Key: "invalid",
      root: "invalid",
      self: "invalid",
    });
    expect(aggregate.edges.find((edge) => edge.key === "missing"))
      .toMatchObject({ declaredPath: "missing" });
    expect(aggregate.diagnostics.filter((item) => item.edge?.key === "root"))
      .toHaveLength(1);
  });

  test("isolates a member with structurally unreadable configuration", () => {
    const root = createRoot();
    const broken = projectDirectory(root, "broken");
    writeFileSync(join(broken, "relic.yaml"), "topology: [", "utf8");
    writeRelic(root, { broken: "broken" });

    const aggregate = loadFederatedKnowledgeProject(root);
    const edge = aggregate.edges[0];

    expect(aggregate.projects.map((node) => node.address.join("/"))).toEqual(["root"]);
    expect(edge).toMatchObject({
      key: "broken",
      child: ["root", "broken"],
      status: "unavailable",
    });
    expect(edge?.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "invalid-relic-yaml",
    );
  });

  test("chooses the shortest lexical address and diagnoses repeated edges", () => {
    const root = createRoot();
    const product = projectDirectory(root, "product");
    const packageRoot = projectDirectory(product, "package");
    writeRelic(packageRoot);
    writeRelic(product, { package: "package" });
    writeRelic(root, {
      "z-package": "product/package",
      product: "product",
      "a-package": "product/package",
    });

    const aggregate = loadFederatedKnowledgeProject(root);
    const aPackage = aggregate.edges.find((edge) => edge.key === "a-package");
    const zPackage = aggregate.edges.find((edge) => edge.key === "z-package");
    const nestedPackage = aggregate.edges.find((edge) =>
      edge.parent.join("/") === "root/product" && edge.key === "package"
    );

    expect(aggregate.projects.map((node) => node.address.join("/"))).toEqual([
      "root",
      "root/a-package",
      "root/product",
    ]);
    expect(aPackage).toMatchObject({ status: "valid", child: ["root", "a-package"] });
    expect(zPackage).toMatchObject({
      status: "repeated",
      child: ["root", "a-package"],
    });
    expect(nestedPackage).toMatchObject({
      status: "repeated",
      child: ["root", "a-package"],
    });
  });

  test("loads an in-bound symlink once and exposes the alias edge", () => {
    if (process.platform === "win32") return;
    const root = createRoot();
    const backend = projectDirectory(root, "services/backend");
    writeRelic(backend);
    mkdirSync(join(root, "aliases"));
    symlinkSync(backend, join(root, "aliases/backend"));
    writeRelic(root, { backend: "aliases/backend" });

    const aggregate = loadFederatedKnowledgeProject(root);

    expect(aggregate.projects.map((node) => node.address.join("/"))).toEqual([
      "root",
      "root/backend",
    ]);
    expect(aggregate.edges[0]).toMatchObject({
      key: "backend",
      status: "noncanonical-alias",
      child: ["root", "backend"],
    });
    expect(aggregate.edges[0]?.diagnostics).toContainEqual(
      expect.objectContaining({ code: "noncanonical-federation-alias" }),
    );
  });

  test("wraps colliding local documents and artifacts with their project address", () => {
    const root = createRoot();
    const backend = projectDirectory(root, "backend");
    writeKnowledgeProject(backend);
    writeKnowledgeProject(root, { backend: "backend" });

    const aggregate = loadFederatedKnowledgeProject(root);
    const notes = aggregate.documents.filter(({ document }) =>
      document.path === "knowledge/notes/NOTE-001-same.md"
    );
    const evidence = aggregate.artifacts.filter(({ artifact }) =>
      artifact.path === "knowledge/specs/001-same/evidence.txt"
    );

    expect(notes.map(({ project, document }) => ({
      project: project.join("/"),
      id: document.id,
      path: document.path,
    }))).toEqual([
      {
        project: "root",
        id: "NOTE-001",
        path: "knowledge/notes/NOTE-001-same.md",
      },
      {
        project: "root/backend",
        id: "NOTE-001",
        path: "knowledge/notes/NOTE-001-same.md",
      },
    ]);
    expect(evidence.map(({ project, artifact }) => ({
      project: project.join("/"),
      path: artifact.path,
    }))).toEqual([
      {
        project: "root",
        path: "knowledge/specs/001-same/evidence.txt",
      },
      {
        project: "root/backend",
        path: "knowledge/specs/001-same/evidence.txt",
      },
    ]);
    expect(notes[0]?.document).toBe(
      aggregate.projects[0]?.knowledge.documents.find((document) =>
        document.path === "knowledge/notes/NOTE-001-same.md"
      ),
    );
    expect(notes[0]?.document).not.toHaveProperty("project");
  });

  test("addresses local links, backlinks, and artifact specifications", () => {
    const root = createRoot();
    writeKnowledgeProject(root);
    writeNote(
      root,
      "[Specification](../specs/001-same/index.html)\n\n[Evidence](../specs/001-same/evidence.txt)",
    );

    const aggregate = loadFederatedKnowledgeProject(root);
    const note = aggregate.documents.find(({ document }) =>
      document.path === "knowledge/notes/NOTE-001-same.md"
    );
    const specification = aggregate.documents.find(({ document }) =>
      document.path === "knowledge/specs/001-same/index.html"
    );
    const evidence = aggregate.artifacts.find(({ artifact }) =>
      artifact.path === "knowledge/specs/001-same/evidence.txt"
    );

    expect(note?.links).toEqual([
      {
        source: {
          project: ["root"],
          path: "knowledge/notes/NOTE-001-same.md",
        },
        href: "../specs/001-same/index.html",
        text: "Specification",
        resolved: {
          project: ["root"],
          path: "knowledge/specs/001-same/index.html",
        },
        target: {
          project: ["root"],
          path: "knowledge/specs/001-same/index.html",
        },
        status: "canonical",
      },
      {
        source: {
          project: ["root"],
          path: "knowledge/notes/NOTE-001-same.md",
        },
        href: "../specs/001-same/evidence.txt",
        text: "Evidence",
        resolved: {
          project: ["root"],
          path: "knowledge/specs/001-same/evidence.txt",
        },
        target: {
          project: ["root"],
          path: "knowledge/specs/001-same/evidence.txt",
        },
        status: "artifact",
      },
    ]);
    expect(specification?.backlinks).toEqual([{
      source: {
        project: ["root"],
        path: "knowledge/notes/NOTE-001-same.md",
      },
      target: {
        project: ["root"],
        path: "knowledge/specs/001-same/index.html",
      },
      href: "../specs/001-same/index.html",
      text: "Specification",
    }]);
    expect(evidence?.specifications).toEqual([{
      project: ["root"],
      path: "knowledge/specs/001-same/index.html",
    }]);
  });

  test("promotes ancestor project-file links to unique descendant targets", () => {
    const root = createRoot();
    const backend = projectDirectory(root, "backend");
    writeKnowledgeProject(backend);
    writeKnowledgeProject(root, { backend: "backend" });
    writeNote(
      root,
      "[Backend note](../../backend/knowledge/notes/NOTE-001-same.md)\n\n[Backend evidence](../../backend/knowledge/specs/001-same/evidence.txt)",
    );

    const aggregate = loadFederatedKnowledgeProject(root);
    const rootNote = aggregate.documents.find(({ project, document }) =>
      project.join("/") === "root" &&
      document.path === "knowledge/notes/NOTE-001-same.md"
    );
    const backendNote = aggregate.documents.find(({ project, document }) =>
      project.join("/") === "root/backend" &&
      document.path === "knowledge/notes/NOTE-001-same.md"
    );
    const localRootNote = aggregate.projects[0]?.knowledge.documents.find((document) =>
      document.path === "knowledge/notes/NOTE-001-same.md"
    );

    expect(localRootNote?.links.map((link) => link.status)).toEqual([
      "project-file",
      "project-file",
    ]);
    expect(localRootNote?.links[0]?.resolvedPath).toBe(
      "backend/knowledge/notes/NOTE-001-same.md",
    );
    expect(localRootNote?.links[0]?.targetPath).toBeUndefined();
    expect(rootNote?.links[0]).toMatchObject({
      status: "canonical",
      resolved: {
        project: ["root", "backend"],
        path: "knowledge/notes/NOTE-001-same.md",
      },
      target: {
        project: ["root", "backend"],
        path: "knowledge/notes/NOTE-001-same.md",
      },
    });
    expect(rootNote?.links[1]).toMatchObject({
      status: "artifact",
      resolved: {
        project: ["root", "backend"],
        path: "knowledge/specs/001-same/evidence.txt",
      },
      target: {
        project: ["root", "backend"],
        path: "knowledge/specs/001-same/evidence.txt",
      },
    });
    expect(backendNote?.backlinks).toContainEqual(expect.objectContaining({
      source: {
        project: ["root"],
        path: "knowledge/notes/NOTE-001-same.md",
      },
      target: {
        project: ["root", "backend"],
        path: "knowledge/notes/NOTE-001-same.md",
      },
    }));
  });

  test("does not federate descendant links upward or across branches", () => {
    const root = createRoot();
    const backend = projectDirectory(root, "backend");
    const frontend = projectDirectory(root, "frontend");
    writeKnowledgeProject(backend);
    writeKnowledgeProject(frontend);
    writeKnowledgeProject(root, { backend: "backend", frontend: "frontend" });
    writeNote(
      backend,
      "[Root note](../../../knowledge/notes/NOTE-001-same.md)\n\n[Frontend note](../../../frontend/knowledge/notes/NOTE-001-same.md)",
    );

    const aggregate = loadFederatedKnowledgeProject(root);
    const backendNote = aggregate.documents.find(({ project, document }) =>
      project.join("/") === "root/backend" &&
      document.path === "knowledge/notes/NOTE-001-same.md"
    );

    expect(backendNote?.links.map((link) => ({
      href: link.href,
      status: link.status,
      target: link.target,
    }))).toEqual([
      {
        href: "../../../knowledge/notes/NOTE-001-same.md",
        status: "unsafe",
        target: undefined,
      },
      {
        href: "../../../frontend/knowledge/notes/NOTE-001-same.md",
        status: "unsafe",
        target: undefined,
      },
    ]);
    expect(aggregate.documents.filter(({ project }) =>
      project.join("/") !== "root/backend"
    ).flatMap((document) => document.backlinks)).toEqual([]);
  });

  test("keeps an overlapping descendant target unowned when promotion is ambiguous", () => {
    const root = createRoot();
    const product = projectDirectory(root, "product");
    writeKnowledgeProject(product);
    writeRelic(
      join(product, "knowledge"),
      {},
      "topology:\n  specs: specs\n  shared: shared\n  records:\n    note: notes\n",
    );
    writeKnowledgeProject(root, {
      product: "product",
      "product-knowledge": "product/knowledge",
    });
    writeNote(
      root,
      "[Overlapping note](../../product/knowledge/notes/NOTE-001-same.md)",
    );

    const aggregate = loadFederatedKnowledgeProject(root);
    const rootNote = aggregate.documents.find(({ project, document }) =>
      project.join("/") === "root" &&
      document.path === "knowledge/notes/NOTE-001-same.md"
    );

    expect(rootNote?.links[0]).toMatchObject({ status: "project-file" });
    expect(rootNote?.links[0]?.target).toBeUndefined();
    expect(aggregate.documents.filter(({ document }) =>
      document.id === "NOTE-001"
    ).map(({ project }) => project.join("/"))).toEqual([
      "root",
      "root/product",
      "root/product-knowledge",
    ]);
  });

  test("searches the aggregate with stable project-qualified results", () => {
    const root = createRoot();
    const backend = projectDirectory(root, "backend");
    writeKnowledgeProject(backend);
    writeKnowledgeProject(root, { backend: "backend" });
    const aggregate = loadFederatedKnowledgeProject(root);

    const documents = searchFederatedKnowledge(aggregate, "NOTE-001");
    const artifacts = searchFederatedKnowledge(aggregate, "same evidence");

    expect(documents.map((result) => ({
      type: result.type,
      project: result.project.join("/"),
      path: result.path,
      score: result.score,
    }))).toEqual([
      {
        type: "document",
        project: "root",
        path: "knowledge/notes/NOTE-001-same.md",
        score: 10,
      },
      {
        type: "document",
        project: "root/backend",
        path: "knowledge/notes/NOTE-001-same.md",
        score: 10,
      },
    ]);
    expect(artifacts.map((result) => ({
      type: result.type,
      project: result.project.join("/"),
      path: result.path,
      specifications: result.type === "artifact"
        ? result.specifications.map((specification) => ({
            project: specification.project.join("/"),
            path: specification.path,
          }))
        : undefined,
    }))).toEqual([
      {
        type: "artifact",
        project: "root",
        path: "knowledge/specs/001-same/evidence.txt",
        specifications: [{
          project: "root",
          path: "knowledge/specs/001-same/index.html",
        }],
      },
      {
        type: "artifact",
        project: "root/backend",
        path: "knowledge/specs/001-same/evidence.txt",
        specifications: [{
          project: "root/backend",
          path: "knowledge/specs/001-same/index.html",
        }],
      },
    ]);
    expect(searchFederatedKnowledge(aggregate, "   ")).toEqual([]);
  });

  test("orders equal search scores lexically by project-address segments", () => {
    const root = createRoot();
    const a = projectDirectory(root, "a");
    const deep = projectDirectory(a, "deep");
    const b = projectDirectory(root, "b");
    writeKnowledgeProject(deep);
    writeKnowledgeProject(b);
    writeRelic(a, { deep: "deep" });
    writeRelic(root, { a: "a", b: "b" });

    const results = searchFederatedKnowledge(
      loadFederatedKnowledgeProject(root),
      "NOTE-001",
    );

    expect(results.map((result) => result.project.join("/"))).toEqual([
      "root/a/deep",
      "root/b",
    ]);
  });

  test("keeps a project without federation as one local root node", () => {
    const root = createRoot();
    writeRelic(root);

    const aggregate = loadFederatedKnowledgeProject(root);

    expect(aggregate.projects).toHaveLength(1);
    expect(aggregate.projects[0]?.address).toEqual(["root"]);
    expect(aggregate.edges).toEqual([]);
    expect(aggregate.documents).toEqual([]);
    expect(aggregate.artifacts).toEqual([]);
  });
});
