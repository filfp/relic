import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
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

import { runSearch } from "../commands/search.ts";

const fixture = join(
  import.meta.dir,
  "../../../core/src/__fixtures__/relic-2-project",
);
let lines: string[];
let originalLog: typeof console.log;
const temporaryDirectories: string[] = [];

function createTemporaryProject(): string {
  const root = mkdtempSync(join(tmpdir(), "relic-search-federation-"));
  temporaryDirectories.push(root);
  return root;
}

function writeSearchProject(
  directory: string,
  members: Record<string, string> = {},
  note = "Federated document needle.",
): void {
  mkdirSync(join(directory, "knowledge/specs/001-same"), { recursive: true });
  mkdirSync(join(directory, "knowledge/shared"), { recursive: true });
  mkdirSync(join(directory, "knowledge/notes"), { recursive: true });
  writeFileSync(
    join(directory, "knowledge/specs/001-same/index.html"),
    '<relic-body id="001-same"><h1>Same specification</h1></relic-body>\n',
  );
  writeFileSync(
    join(directory, "knowledge/specs/001-same/evidence.txt"),
    "federated evidence needle\n",
  );
  writeFileSync(
    join(directory, "knowledge/notes/NOTE-001-same.md"),
    `---\nid: NOTE-001\n---\n\n# Same note\n\n${note}\n`,
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

beforeEach(() => {
  lines = [];
  originalLog = console.log;
  console.log = (value?: unknown) => lines.push(String(value));
});

afterEach(() => {
  console.log = originalLog;
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("Relic 2.0 search command", () => {
  test("searches IDs, metadata, memberships, paths, and content", async () => {
    expect((await runSearch({ query: "fr-001", projectDir: fixture })).results)
      .toContainEqual(
        expect.objectContaining({
          type: "document",
          id: "FR-001",
          memberships: ["fr"],
        }),
      );
    expect((await runSearch({ query: "essential", projectDir: fixture })).results)
      .toEqual([
        expect.objectContaining({ type: "document", id: "FR-001" }),
      ]);
    expect((await runSearch({ query: "legacy session", projectDir: fixture })).results)
      .toEqual([
        expect.objectContaining({
          type: "artifact",
          path: "knowledge/specs/001-auth/notes.md",
        }),
      ]);
    expect((await runSearch({ query: "BR-001", projectDir: fixture })).results)
      .toContainEqual(
        expect.objectContaining({
          type: "document",
          id: "BR-001",
          memberships: ["br"],
        }),
      );
    expect((await runSearch({ query: "refresh-token family", projectDir: fixture })).results)
      .toContainEqual(
        expect.objectContaining({
          type: "document",
          id: "GL-001",
          memberships: ["gl"],
        }),
      );
  });

  test("emits the same exhaustive result model as JSON", async () => {
    const output = await runSearch({
      query: "authentication",
      json: true,
      projectDir: fixture,
    });
    expect(JSON.parse(lines.at(-1) ?? "")).toEqual(output);
    expect(output.results.some((result) => result.type === "document")).toBe(true);
    expect(output.results.some((result) => result.type === "artifact")).toBe(true);
    expect(output).not.toHaveProperty("federation");
  });

  test("uses a concise human projection by default", async () => {
    await runSearch({ query: "FR-001", projectDir: fixture });
    expect(lines[0]).toContain("Relic search: FR-001");
    expect(lines).toContain("[document] FR-001 — Authenticate valid credentials");
    expect(lines).toContain(
      "  path: knowledge/records/requirements/FR-001-login.md",
    );
  });

  test("searches every reached project with addressed JSON results", async () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeSearchProject(backend);
    writeSearchProject(root, { backend: "backend" });

    const documents = await runSearch({
      query: "document needle",
      json: true,
      projectDir: root,
    });
    const artifacts = await runSearch({
      query: "evidence needle",
      json: true,
      projectDir: root,
    });

    expect(documents).not.toHaveProperty("federation");
    expect(documents.results.map((result) => ({
      type: result.type,
      project: "project" in result ? result.project.join("/") : undefined,
      path: result.path,
    }))).toEqual([
      {
        type: "document",
        project: "root",
        path: "knowledge/notes/NOTE-001-same.md",
      },
      {
        type: "document",
        project: "root/backend",
        path: "knowledge/notes/NOTE-001-same.md",
      },
    ]);
    expect(artifacts.results.map((result) => ({
      project: "project" in result ? result.project.join("/") : undefined,
      specifications: result.type === "artifact" && "specifications" in result
        ? result.specifications.map((specification) => ({
            project: specification.project.join("/"),
            path: specification.path,
          }))
        : undefined,
    }))).toEqual([
      {
        project: "root",
        specifications: [{
          project: "root",
          path: "knowledge/specs/001-same/index.html",
        }],
      },
      {
        project: "root/backend",
        specifications: [{
          project: "root/backend",
          path: "knowledge/specs/001-same/index.html",
        }],
      },
    ]);
    expect(JSON.parse(lines.at(-1) ?? "")).toEqual(artifacts);

    const nested = await runSearch({
      query: "document needle",
      json: true,
      projectDir: backend,
    });
    expect(nested.results).toHaveLength(1);
    expect(nested).not.toHaveProperty("federation");
    expect(nested.results[0]).not.toHaveProperty("project");
  });

  test("keeps member search usable without maintenance output when the root topology is invalid", async () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeSearchProject(backend);
    writeFileSync(
      join(root, "relic.yaml"),
      "topology:\n  specs: ../../outside\nfederation:\n  members:\n    backend: backend\n",
    );

    const output = await runSearch({
      query: "document needle",
      json: true,
      projectDir: root,
    });

    expect(output.results).toEqual([
      expect.objectContaining({
        type: "document",
        project: ["root", "backend"],
        path: "knowledge/notes/NOTE-001-same.md",
      }),
    ]);
    expect(output).not.toHaveProperty("federation");
    expect(JSON.parse(lines.at(-1) ?? "")).toEqual(output);
  });

  test("qualifies federated human results without unrelated diagnostics", async () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeSearchProject(backend);
    writeSearchProject(root, {
      backend: "backend",
      missing: "missing",
    });

    await runSearch({ query: "document needle", projectDir: root });

    expect(lines[0]).toContain("2 results across 2 projects");
    expect(lines.filter((line) => line === "  project: root")).toHaveLength(1);
    expect(lines.filter((line) => line === "  project: root/backend"))
      .toHaveLength(1);
    expect(lines.some((line) => line.includes("diagnostics"))).toBe(false);
    expect(lines.some((line) => line.includes("federation.members.missing")))
      .toBe(false);
  });

  test("leaves member boundary diagnostics to verify", async () => {
    const root = createTemporaryProject();
    const backend = join(root, "backend");
    mkdirSync(backend);
    writeSearchProject(
      backend,
      {},
      "[Outside](../../../knowledge/notes/NOTE-001-same.md)",
    );
    writeSearchProject(root, { backend: "backend" });

    const output = await runSearch({ query: "NOTE-001", projectDir: root });

    expect(output.results).toHaveLength(2);
    expect(output).not.toHaveProperty("federation");
    expect(lines.some((line) => line.includes("Relative link leaves"))).toBe(false);
  });

  test("rejects an empty query and unreadable topology", async () => {
    await expect(runSearch({ query: " ", projectDir: fixture })).rejects.toThrow(
      /cannot be empty/,
    );

    const malformed = mkdtempSync(join(tmpdir(), "relic-search-malformed-"));
    try {
      writeFileSync(join(malformed, "relic.yaml"), "project: no topology\n");
      await expect(
        runSearch({ query: "anything", projectDir: malformed }),
      ).rejects.toThrow(/topology is unavailable/);
    } finally {
      rmSync(malformed, { recursive: true, force: true });
    }
  });

  test("does not mutate project knowledge", async () => {
    const before = snapshot(fixture);
    await runSearch({ query: "auth", projectDir: fixture });
    expect(snapshot(fixture)).toEqual(before);
  });
});
