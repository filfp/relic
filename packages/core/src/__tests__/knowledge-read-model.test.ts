import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdtempSync,
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
  formatIdentityNumber,
  loadKnowledgeProject,
  nextIdentityNumber,
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
        epic: "knowledge/records/epics",
      },
    });
    expect(project.documents).toHaveLength(9);
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
    const relicPath = join(copied, ".relic/RELIC.md");
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

  test("derives next identity values from only the current corpus", () => {
    const project = loadKnowledgeProject(fixture);

    expect(formatIdentityNumber(nextIdentityNumber(project, "spec"))).toBe("003");
    expect(formatIdentityNumber(nextIdentityNumber(project, "fr"))).toBe("002");
    expect(formatIdentityNumber(nextIdentityNumber(project, "nfr"))).toBe("002");
    expect(formatIdentityNumber(nextIdentityNumber(project, "adr"))).toBe("002");
    expect(formatIdentityNumber(nextIdentityNumber(project, "epic"))).toBe("002");

    const copied = copyFixture();
    rmSync(
      join(copied, "knowledge/records/epics/EPIC-001-authentication.md"),
    );
    expect(nextIdentityNumber(loadKnowledgeProject(copied), "epic")).toBe(1);
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

  test("keeps RELIC.md visible when malformed topology blocks discovery", () => {
    const copied = copyFixture();
    writeFileSync(
      join(copied, ".relic/RELIC.md"),
      "---\ntopology:\n  specs: ../../outside\n---\n\n# Broken map\n",
      "utf8",
    );

    const project = loadKnowledgeProject(copied);
    expect(project.topology).toBeUndefined();
    expect(project.documents.map((document) => document.path)).toEqual([
      ".relic/RELIC.md",
    ]);
    expect(project.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "invalid-topology",
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
      "# Record\n\n- first\n- [x] second\n\n| Kind | Count |\n| --- | ---: |\n| FR | 2 |\n",
      "records/FR-001.md",
    );
    const list = parsed.ast.find((node) => node.type === "list");
    const table = parsed.ast.find((node) => node.type === "table");

    expect(list?.children?.map((node) => node.type)).toEqual([
      "list_item",
      "list_item",
    ]);
    expect(list?.children?.[1]?.checked).toBe(true);
    expect(table?.children?.map((node) => node.type)).toEqual([
      "table_header",
      "table_row",
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
});
