import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadKnowledgeProject,
  parseFrontmatter,
  parseMarkdown,
  parseSpecHtml,
  searchKnowledge,
} from "../knowledge/index.ts";

const fixture = fileURLToPath(
  new URL("../__fixtures__/relic-2-project", import.meta.url),
);
const temporaryDirectories: string[] = [];

function copyFixture(): string {
  const temporary = mkdtempSync(join(tmpdir(), "relic-2-core-"));
  temporaryDirectories.push(temporary);
  cpSync(fixture, temporary, { recursive: true });
  return temporary;
}

function createRelicMember(projectRoot: string, memberPath: string): string {
  const memberRoot = join(projectRoot, memberPath);
  mkdirSync(memberRoot, { recursive: true });
  writeFileSync(
    join(memberRoot, "relic.yaml"),
    "topology:\n  specs: .relic/specs\n  shared: .relic/shared\n  records: {}\n",
    "utf8",
  );
  return memberRoot;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("Relic 2.0 knowledge read model", () => {
  test("loads the complete canonical corpus and keeps spec artifacts separate", () => {
    const project = loadKnowledgeProject(fixture);

    expect(project.topology).toEqual({
      specs: "knowledge/specs",
      shared: "knowledge/shared",
      records: {
        fr: "knowledge/records/requirements",
        nfr: "knowledge/records/requirements/non-functional",
        adr: "knowledge/records/decisions",
        br: "knowledge/records/business-rules",
        gl: "knowledge/records/glossary",
        epic: "knowledge/records/epics",
      },
    });
    expect(project.federation).toBeUndefined();
    expect(project.documents).toHaveLength(10);
    expect(project.documents.map((document) => document.path)).not.toContain(
      "relic.yaml",
    );
    expect(project.documents.map((document) => document.path)).toContain(
      "knowledge/specs/001-auth/index.html",
    );
    expect(project.artifacts).toEqual([
      expect.objectContaining({
        path: "knowledge/specs/001-auth/notes.md",
        specificationPaths: ["knowledge/specs/001-auth/index.html"],
        mediaType: "text",
      }),
    ]);
    expect(project.artifacts[0]!.searchableText).toContain("legacy session cookie");
  });

  test("discovers business rules and glossary entries as canonical records", () => {
    const project = loadKnowledgeProject(fixture);
    const businessRule = project.documents.find((document) => document.id === "BR-001");
    const glossaryEntry = project.documents.find((document) => document.id === "GL-001");

    expect(businessRule?.memberships).toEqual(["br"]);
    expect(glossaryEntry?.memberships).toEqual(["gl"]);
    expect(businessRule?.diagnostics.map((diagnostic) => diagnostic.code))
      .not.toContain("invalid-document-id");
    expect(glossaryEntry?.diagnostics.map((diagnostic) => diagnostic.code))
      .not.toContain("invalid-document-id");
  });

  test("discovers project-defined record kinds without a core taxonomy change", () => {
    const copied = copyFixture();
    const risks = join(copied, "knowledge/records/risks");
    mkdirSync(risks);
    writeFileSync(
      join(risks, "RISK-001-provider-outage.md"),
      "---\nid: RISK-001\n---\n\n# Provider outage\n",
      "utf8",
    );
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}    risk: knowledge/records/risks\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.documents.find((document) => document.id === "RISK-001"))
      .toMatchObject({ memberships: ["risk"] });
    expect(project.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "invalid-record-kind" }),
    );
  });

  test("discovers hyphenated record kinds with their full uppercase ID prefix", () => {
    const copied = copyFixture();
    const postmortems = join(copied, "knowledge/records/backend-postmortems");
    mkdirSync(postmortems);
    writeFileSync(
      join(postmortems, "BACKEND-POSTMORTEM-001-provider-outage.md"),
      "---\nid: BACKEND-POSTMORTEM-001\n---\n\n# Provider outage\n",
      "utf8",
    );
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}    backend-postmortem: knowledge/records/backend-postmortems\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.topology?.records["backend-postmortem"]).toBe(
      "knowledge/records/backend-postmortems",
    );
    expect(
      project.documents.find((document) => document.id === "BACKEND-POSTMORTEM-001"),
    ).toMatchObject({ memberships: ["backend-postmortem"] });
    expect(project.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "invalid-record-kind" }),
    );
    expect(project.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "invalid-document-id" }),
    );
  });

  test("deduplicates overlapping canonical roots into memberships", () => {
    const project = loadKnowledgeProject(fixture);
    const nfr = project.documents.find((document) => document.id === "NFR-001");

    expect(nfr).toBeDefined();
    expect(nfr!.memberships).toEqual(["fr", "nfr"]);
    expect(
      project.documents.filter((document) => document.path === nfr!.path),
    ).toHaveLength(1);
  });

  test("derives links, backlinks, artifacts, broken links, and orphans independently", () => {
    const project = loadKnowledgeProject(fixture);
    const spec = project.documents.find((document) => document.id === "001-auth")!;
    const fr = project.documents.find((document) => document.id === "FR-001")!;
    const orphan = project.documents.find((document) => document.id === "002-orphan")!;

    expect(spec.links.filter((link) => link.status === "canonical")).toHaveLength(3);
    expect(spec.links.find((link) => link.href === "notes.md")?.status).toBe("artifact");
    expect(
      spec.links.find((link) => link.href.endsWith("missing.md"))?.status,
    ).toBe("missing");
    expect(fr.backlinks.map((backlink) => backlink.sourcePath)).toEqual([
      "knowledge/specs/001-auth/index.html",
    ]);
    expect(
      fr.backlinks.some((backlink) => backlink.sourcePath.endsWith("notes.md")),
    ).toBe(false);
    expect(orphan.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "orphan-document",
    );
  });

  test("keeps moved topology readable and exposes authored links that need repair", () => {
    const copied = copyFixture();
    renameSync(
      join(copied, "knowledge/shared"),
      join(copied, "knowledge/contracts"),
    );
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      readFileSync(relicPath, "utf8").replace(
        "shared: knowledge/shared",
        "shared: knowledge/contracts",
      ),
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.documents.map((document) => document.path)).toContain(
      "knowledge/contracts/auth-contract.md",
    );
    const spec = project.documents.find((document) => document.id === "001-auth")!;
    expect(
      spec.links.find((link) => link.href === "../../shared/auth-contract.md")?.status,
    ).toBe("missing");
    expect(spec.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "broken-link",
    );
  });

  test("loads a corpus from a repository-contained submodule directory", () => {
    const copied = copyFixture();
    renameSync(join(copied, "knowledge"), join(copied, "specs-repository"));
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      readFileSync(relicPath, "utf8").replaceAll(
        "knowledge/",
        "specs-repository/",
      ),
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.topology?.specs).toBe("specs-repository/specs");
    expect(project.documents.map((document) => document.path)).toContain(
      "specs-repository/specs/001-auth/index.html",
    );
    expect(project.diagnostics.some((item) => item.code === "path-escape"))
      .toBe(false);
  });

  test("preserves readable HTML while rejecting active and remote content", () => {
    const project = loadKnowledgeProject(fixture);
    const spec = project.documents.find((document) => document.id === "001-auth")!;
    const codes = spec.diagnostics.map((diagnostic) => diagnostic.code);

    expect(spec.searchableText).toContain("Authentication");
    expect(spec.searchableText).not.toContain("compromised");
    expect(codes).toContain("unsafe-html");
    expect(codes).toContain("unsafe-media-url");
    expect(spec.source).toContain("<script>");
  });

  test("keeps unknown Relic components readable and diagnosed", () => {
    const project = loadKnowledgeProject(fixture);
    const orphan = project.documents.find((document) => document.id === "002-orphan")!;

    expect(orphan.searchableText).toContain(
      "Its readable content survives an unknown component",
    );
    expect(orphan.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "unknown-relic-component",
    );
  });

  test("reports case-insensitive duplicate identities without hiding documents", () => {
    const project = loadKnowledgeProject(fixture);
    const duplicates = project.documents.filter(
      (document) => document.id?.toLowerCase() === "shared-auth-contract",
    );

    expect(duplicates).toHaveLength(2);
    for (const document of duplicates) {
      expect(document.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
        "duplicate-document-id",
      );
    }
  });

  test("searches every canonical document and textual artifact with parent context", () => {
    const project = loadKnowledgeProject(fixture);
    const artifactResults = searchKnowledge(project, "legacy session cookie");
    const orphanResults = searchKnowledge(project, "orphaned experiment");

    expect(artifactResults).toEqual([
      expect.objectContaining({
        type: "artifact",
        path: "knowledge/specs/001-auth/notes.md",
        specificationPaths: ["knowledge/specs/001-auth/index.html"],
      }),
    ]);
    expect(orphanResults).toEqual([
      expect.objectContaining({
        type: "document",
        id: "002-orphan",
      }),
    ]);
    expect(searchKnowledge(project, "   ")).toEqual([]);
  });

  test("keeps relic.yaml out of the catalog when malformed topology blocks discovery", () => {
    const copied = copyFixture();
    writeFileSync(
      join(copied, "relic.yaml"),
      "topology:\n  specs: ../../outside\n",
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.topology).toBeUndefined();
    expect(project.documents).toEqual([]);
    expect(project.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "invalid-topology",
    );
  });

  test("isolates invalid record keys without hiding the valid topology", () => {
    const copied = copyFixture();
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}    Backend_Note: knowledge/records/business-rules\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.topology).toBeDefined();
    expect(project.topology?.records).not.toHaveProperty("Backend_Note");
    expect(project.documents.find((document) => document.id === "BR-001"))
      .toMatchObject({ memberships: ["br"] });
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "invalid-record-kind",
        message:
          'topology.records key "Backend_Note" must start with a lowercase letter and contain only lowercase letters, digits, and single hyphens between segments',
        path: "relic.yaml",
      }),
    );
  });

  test("isolates invalid record paths without hiding the valid topology", () => {
    const copied = copyFixture();
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}    backend-note: ../../outside\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.topology).toBeDefined();
    expect(project.topology?.records).not.toHaveProperty("backend-note");
    expect(project.documents.find((document) => document.id === "BR-001"))
      .toMatchObject({ memberships: ["br"] });
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "invalid-topology-path",
        message: "topology.records.backend-note escapes the repository boundary",
        path: "relic.yaml",
      }),
    );
  });

  test("parses explicit federation members without loading their corpora", () => {
    const copied = copyFixture();
    const backendRoot = createRelicMember(copied, "services/backend");
    writeFileSync(join(backendRoot, "relic.yaml"), "topology: [", "utf8");
    createRelicMember(copied, "apps/frontend");
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}federation:\n  members:\n    backend-api: ./services/backend/\n    frontend: apps/frontend\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);

    expect(project.federation).toEqual({
      members: [
        {
          key: "backend-api",
          declaredPath: "./services/backend/",
          normalizedPath: "services/backend",
          diagnostics: [],
        },
        {
          key: "frontend",
          declaredPath: "apps/frontend",
          normalizedPath: "apps/frontend",
          diagnostics: [],
        },
      ],
    });
    expect(project.documents).toHaveLength(10);
    expect(project.documents.every((document) => !document.path.startsWith("services/")))
      .toBe(true);
  });

  test("isolates invalid federation entries without hiding valid members or topology", () => {
    const copied = copyFixture();
    createRelicMember(copied, "services/backend");
    mkdirSync(join(copied, "services/no-config"), { recursive: true });
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}federation:\n  members:\n    backend: services/backend\n    root: services/backend\n    Backend_API: services/backend\n    escaped: ../../outside\n    missing: services/missing\n    no-config: services/no-config\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);

    expect(project.topology).toBeDefined();
    expect(project.federation?.members).toHaveLength(6);
    expect(project.federation?.members.filter((member) =>
      member.diagnostics.length === 0
    )).toEqual([{
      key: "backend",
      declaredPath: "services/backend",
      normalizedPath: "services/backend",
      diagnostics: [],
    }]);
    expect(project.documents).toHaveLength(10);
    expect(project.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid-federation-member-key" }),
        expect.objectContaining({ code: "invalid-federation-member-path" }),
        expect.objectContaining({ code: "invalid-federation-member" }),
      ]),
    );
  });

  test("keeps federation readable when local topology is invalid", () => {
    const copied = copyFixture();
    createRelicMember(copied, "services/backend");
    writeFileSync(
      join(copied, "relic.yaml"),
      "topology:\n  specs: ../../outside\nfederation:\n  members:\n    backend: services/backend\n",
      "utf8",
    );

    const project = loadKnowledgeProject(copied);

    expect(project.topology).toBeUndefined();
    expect(project.federation).toEqual({
      members: [{
        key: "backend",
        declaredPath: "services/backend",
        normalizedPath: "services/backend",
        diagnostics: [],
      }],
    });
    expect(project.documents).toEqual([]);
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({ code: "invalid-topology" }),
    );
  });

  test("keeps local topology readable when federation is malformed", () => {
    const copied = copyFixture();
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}federation:\n  members: []\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);

    expect(project.topology).toBeDefined();
    expect(project.federation).toBeUndefined();
    expect(project.documents).toHaveLength(10);
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({ code: "invalid-federation" }),
    );
  });

  test("rejects federation members whose project authority is symlinked", () => {
    if (process.platform === "win32") return;
    const copied = copyFixture();
    const memberRoot = createRelicMember(copied, "services/backend");
    const outside = mkdtempSync(join(tmpdir(), "relic-member-config-outside-"));
    temporaryDirectories.push(outside);
    const externalConfig = join(outside, "relic.yaml");
    writeFileSync(
      externalConfig,
      readFileSync(join(memberRoot, "relic.yaml"), "utf8"),
      "utf8",
    );
    rmSync(join(memberRoot, "relic.yaml"));
    symlinkSync(externalConfig, join(memberRoot, "relic.yaml"));
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}federation:\n  members:\n    backend: services/backend\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);

    expect(project.topology).toBeDefined();
    expect(project.federation?.members).toHaveLength(1);
    expect(project.federation?.members[0]).toMatchObject({
      key: "backend",
      declaredPath: "services/backend",
    });
    expect(project.federation?.members[0]?.normalizedPath).toBeUndefined();
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "invalid-federation-member",
        message:
          "federation.members.backend must contain a regular, non-symlinked relic.yaml",
      }),
    );
  });

  test("rejects federation member directories that resolve outside the project", () => {
    if (process.platform === "win32") return;
    const copied = copyFixture();
    const outside = mkdtempSync(join(tmpdir(), "relic-member-outside-"));
    temporaryDirectories.push(outside);
    writeFileSync(
      join(outside, "relic.yaml"),
      "topology:\n  specs: specs\n  shared: shared\n  records: {}\n",
      "utf8",
    );
    mkdirSync(join(copied, "services"), { recursive: true });
    symlinkSync(outside, join(copied, "services/external"));
    const relicPath = join(copied, "relic.yaml");
    writeFileSync(
      relicPath,
      `${readFileSync(relicPath, "utf8")}federation:\n  members:\n    external: services/external\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);

    expect(project.federation?.members).toHaveLength(1);
    expect(project.federation?.members[0]).toMatchObject({
      key: "external",
      declaredPath: "services/external",
    });
    expect(project.federation?.members[0]?.normalizedPath).toBeUndefined();
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "invalid-federation-member-path",
        message:
          "federation.members.external resolves outside the declaring project boundary",
      }),
    );
  });

  test("rejects unsupported top-level state in relic.yaml", () => {
    const copied = copyFixture();
    writeFileSync(
      join(copied, "relic.yaml"),
      `${readFileSync(join(copied, "relic.yaml"), "utf8")}engines:\n  - codex\n`,
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.topology).toBeUndefined();
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "invalid-relic-config",
        path: "relic.yaml",
      }),
    );
  });

  test("rejects a symlinked relic.yaml authority", () => {
    if (process.platform === "win32") return;
    const copied = copyFixture();
    const outside = mkdtempSync(join(tmpdir(), "relic-config-outside-"));
    temporaryDirectories.push(outside);
    const externalConfig = join(outside, "relic.yaml");
    writeFileSync(
      externalConfig,
      readFileSync(join(copied, "relic.yaml"), "utf8"),
      "utf8",
    );
    rmSync(join(copied, "relic.yaml"));
    symlinkSync(externalConfig, join(copied, "relic.yaml"));

    const project = loadKnowledgeProject(copied);
    expect(project.documents).toEqual([]);
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "invalid-relic-config",
        path: "relic.yaml",
      }),
    );
  });

  test("rejects symlink escapes during artifact discovery", () => {
    if (process.platform === "win32") return;
    const copied = copyFixture();
    const outside = mkdtempSync(join(tmpdir(), "relic-2-outside-"));
    temporaryDirectories.push(outside);
    const secret = join(outside, "secret.txt");
    writeFileSync(secret, "must not be indexed", "utf8");
    symlinkSync(
      secret,
      join(copied, "knowledge/specs/001-auth/escaped.txt"),
    );

    const project = loadKnowledgeProject(copied);
    expect(
      project.artifacts.some((artifact) => artifact.searchableText?.includes("must not")),
    ).toBe(false);
    expect(project.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "path-escape",
    );
  });
});

describe("Relic 2.0 typed HTML parser", () => {
  test("does not expose unsafe link schemes as graph candidates", () => {
    const parsed = parseSpecHtml(
      '<relic-body id="001-safe"><a href="javascript:alert(1)">bad</a><p>ok</p></relic-body>',
      "specs/001-safe/index.html",
    );

    expect(parsed.links).toEqual([]);
    expect(parsed.searchableText).toContain("bad ok");
    expect(parsed.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "unsafe-url",
    );
  });

  test("keeps semantic chart source in the renderable AST", () => {
    const parsed = parseSpecHtml(
      '<relic-body id="001-chart"><relic-chart type="bar"><table><tr><th>Kind</th><th>Count</th></tr><tr><td>FR</td><td>2</td></tr></table></relic-chart></relic-body>',
      "specs/001-chart/index.html",
    );
    const chart = parsed.ast.find(
      (node) => node.type === "element" && node.tag === "relic-chart",
    );

    expect(chart).toBeDefined();
    expect(chart?.type === "element" && chart.children[0]).toMatchObject({
      type: "element",
      tag: "table",
    });
    expect(parsed.searchableText).toContain("Kind Count FR 2");
  });
});

describe("Relic 2.0 Markdown parser", () => {
  test("keeps lists and tables structurally renderable", () => {
    const parsed = parseMarkdown(
      "# Record\n\n4. first\n5. second\n\n| Kind | Count |\n| :--- | ---: |\n| FR | 2 |\n",
      "records/FR-001.md",
    );
    const list = parsed.ast.find((node) => node.type === "list");
    const table = parsed.ast.find((node) => node.type === "table");

    expect(list?.children?.map((node) => node.type)).toEqual([
      "list_item",
      "list_item",
    ]);
    expect(list).toMatchObject({ ordered: true, start: 4 });
    expect(table?.children?.map((node) => node.type)).toEqual([
      "table_header",
      "table_row",
    ]);
    expect(table?.children?.[0]?.children?.map((cell) => cell.align)).toEqual([
      "left",
      "right",
    ]);
  });

  test("pairs unbalanced HTML blocks so Markdown nests inside the element", () => {
    const parsed = parseMarkdown(
      [
        "## Flows",
        "",
        "<details>",
        "<summary><strong>Import</strong> — admin uploads the catalog</summary>",
        "",
        "1. An admin opens the catalog.",
        "",
        "</details>",
        "",
        "After the disclosure.",
        "",
      ].join("\n"),
      "records/FR-001.md",
    );

    const details = parsed.ast.find((node) => node.type === "html_element");
    expect(details).toMatchObject({ type: "html_element", tag: "details" });
    expect(details?.children?.map((child) => child.type)).toContain("list");
    const summary = details?.children?.find((child) => child.tag === "summary");
    expect(summary?.children?.[0]).toMatchObject({ tag: "strong" });
    expect(parsed.ast.at(-1)).toMatchObject({ type: "paragraph" });
    expect(parsed.diagnostics).toEqual([]);
  });

  test("nests a disclosure inside another disclosure", () => {
    const parsed = parseMarkdown(
      "<details>\n<summary>Outer</summary>\n\n<details>\n<summary>Inner</summary>\n\nDeep.\n\n</details>\n\n</details>\n",
      "records/FR-001.md",
    );

    const outer = parsed.ast[0];
    const inner = outer?.children?.find((child) => child.tag === "details");
    expect(outer).toMatchObject({ tag: "details" });
    expect(inner?.children?.map((child) => child.type)).toContain("paragraph");
    expect(parsed.ast).toHaveLength(1);
  });

  test("applies the safe vocabulary to embedded HTML", () => {
    const parsed = parseMarkdown(
      '<iframe src="http://example.test"></iframe>\n\n<img src="x.png" onerror="alert(1)" alt="a">\n\nAfter.\n',
      "records/FR-001.md",
    );

    const codes = parsed.diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes).toContain("unsafe-html");
    expect(codes).toContain("unsafe-html-attribute");
    expect(parsed.ast.some((node) => node.tag === "iframe")).toBe(false);
    expect(parsed.ast.find((node) => node.tag === "img")?.attributes)
      .toEqual({ src: "x.png", alt: "a" });
    expect(parsed.ast.at(-1)).toMatchObject({ type: "paragraph" });
  });

  test("discards content nested inside an unsafe element", () => {
    const parsed = parseMarkdown(
      "Before <script>alert(1)</script> after.\n",
      "records/FR-001.md",
    );

    expect(parsed.searchableText).not.toContain("alert(1)");
    const paragraph = parsed.ast[0];
    expect(JSON.stringify(paragraph)).not.toContain("alert(1)");
  });

  test("keeps unsupported wrappers readable and reports stray end tags", () => {
    const parsed = parseMarkdown(
      "<custom-thing>\n\nKept **content**.\n\n</custom-thing>\n\n</span>\n",
      "records/FR-001.md",
    );

    const codes = parsed.diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes).toContain("unsupported-html");
    expect(codes).toContain("unbalanced-html");
    expect(parsed.ast.some((node) => node.type === "paragraph")).toBe(true);
  });

  test("treats an HTML anchor as an ordinary knowledge link", () => {
    const parsed = parseMarkdown(
      '<p>See <a href="../decisions/ADR-001.md">the decision</a>.</p>\n',
      "records/FR-001.md",
    );

    expect(parsed.links).toEqual([
      { href: "../decisions/ADR-001.md", text: "the decision" },
    ]);
  });
});

describe("Relic 2.0 frontmatter parser", () => {
  test("turns aliases into diagnostics instead of throwing", () => {
    const parsed = parseFrontmatter(
      "---\nvalue: &shared current\ncopy: *shared\n---\nbody\n",
      "shared/aliased.md",
    );

    expect(parsed.metadata).toEqual({});
    expect(parsed.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "unsafe-frontmatter-alias",
    );
  });

  test("accepts empty frontmatter as an empty mapping", () => {
    expect(parseFrontmatter("---\n---\n# Empty\n", "empty.md")).toMatchObject({
      present: true,
      metadata: {},
      body: "# Empty\n",
      diagnostics: [],
    });
  });
});
