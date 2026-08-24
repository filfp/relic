import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type {
  DocumentSummary,
  FederatedKnowledgeProjectView,
  HtmlAstNode,
  KnowledgeLink,
  MarkdownAstNode,
  ProjectAddress,
  ProjectView,
} from "../api";
import {
  artifactContentUrl,
  documentRoute,
  pathFromRoute,
  projectFromLocation,
  resolveRelativePath,
} from "../api";
import { catalogGroups, membershipOptions } from "../catalog";
import { Callout } from "../components/bits";
import { Flow } from "../components/Flow";
import { Fragment } from "../components/Fragment";
import { KnowledgeAnchor } from "../components/KnowledgeAnchor";
import { Markdown } from "../components/Markdown";
import { Metadata } from "../components/Metadata";
import { ProjectChip } from "../components/ProjectChip";
import { CatalogGroups, ProjectTree } from "../pages/Catalog";

function renderFragment(nodes: HtmlAstNode[]): string {
  return renderToStaticMarkup(
    <Fragment nodes={nodes} links={[]} sourcePath="knowledge/specs/001/index.html" />,
  );
}

function renderMarkdown(ast: MarkdownAstNode[], links: KnowledgeLink[] = []): string {
  return renderToStaticMarkup(
    <Markdown ast={ast} links={links} sourcePath="records/FR-001.md" />,
  );
}

function rectanglePositions(markup: string): number[] {
  return [...markup.matchAll(/<rect x="([0-9.]+)"/g)].map((match) => Number(match[1]));
}

function documentSummary(
  path: string,
  memberships: string[],
  id = path,
): DocumentSummary {
  return {
    path,
    format: "markdown",
    memberships,
    id,
    label: `${id} label`,
    metadata: {},
    outgoing: 0,
    backlinks: 0,
    diagnostics: [],
  };
}

describe("Relic viewer content rendering", () => {
  test("derives membership filters from project topology without a fixed taxonomy", () => {
    const project: ProjectView = {
      project: { name: "fixture", path: "/fixture" },
      topology: {
        specs: ".relic/specs",
        shared: ".relic/shared",
        records: { risk: "knowledge/risks", br: "knowledge/rules" },
      },
      documents: [
        documentSummary("spec.md", ["spec"]),
        documentSummary("risk.md", ["risk"]),
        documentSummary("custom.md", ["custom"]),
      ],
      artifacts: [],
      diagnostics: [],
      counts: {
        documents: 3,
        artifacts: 0,
        diagnostics: 0,
        errors: 0,
        warnings: 0,
        orphans: 0,
      },
    };

    expect(membershipOptions(project)).toEqual(["spec", "risk", "custom"]);
  });

  test("filters and groups the catalog by exact membership shape without duplicates", () => {
    const documents = [
      documentSummary("one.md", ["fr"], "FR-001"),
      documentSummary("two.md", ["spec", "fr"], "FR-002"),
      documentSummary("three.md", ["adr"], "ADR-001"),
    ];
    const groups = catalogGroups(documents, ["spec", "fr", "adr"], "fr");
    const markup = renderToStaticMarkup(<CatalogGroups groups={groups} />);

    expect(groups.map((group) => group.key)).toEqual(["spec+fr", "fr"]);
    expect(groups.flatMap((group) => group.documents)).toHaveLength(2);
    expect(markup).toContain("<details class=\"rl-catalog-group\" open=\"\"");
    expect(markup).toContain("FR-001");
    expect(markup).toContain("FR-002");
    expect(markup).not.toContain("ADR-001");
  });

  test("keeps colliding federated catalog identities and routes distinct", () => {
    const root = {
      ...documentSummary("same.md", ["note"], "NOTE-001"),
      project: ["root"] as ProjectAddress,
    };
    const backend = {
      ...documentSummary("same.md", ["note"], "NOTE-001"),
      project: ["root", "backend"] as ProjectAddress,
    };
    const groups = catalogGroups([root, backend], ["note"], null);
    const markup = renderToStaticMarkup(<CatalogGroups groups={groups} />);

    expect(markup).toContain("/document/same.md?project=root");
    expect(markup).toContain("/document/same.md?project=root%2Fbackend");
    expect(markup).toContain("tone-slate\">backend</span>");
    expect(markup).not.toContain("tone-slate\">root</span>");
  });

  test("presents project ownership relative to the selected federation root", () => {
    expect(renderToStaticMarkup(<ProjectChip address={["root"]} />)).toBe("");
    expect(renderToStaticMarkup(
      <ProjectChip address={["root", "backend"]} />,
    )).toContain(">backend</span>");
    expect(renderToStaticMarkup(
      <ProjectChip address={["root", "backend", "domain"]} />,
    )).toContain("backend/domain");
  });

  test("presents hierarchical federation projects as a tree", () => {
    const counts = {
      documents: 1,
      artifacts: 0,
      diagnostics: 0,
      errors: 0,
      warnings: 0,
      orphans: 1,
    };
    const project: FederatedKnowledgeProjectView = {
      project: { name: "root", path: "/root" },
      documents: [],
      artifacts: [],
      diagnostics: [],
      counts,
      federation: {
        projects: [
          { address: ["root"], counts },
          { address: ["root", "product"], counts },
          { address: ["root", "product", "api"], counts },
        ],
        edges: [],
      },
    };
    const markup = renderToStaticMarkup(
      <ProjectTree project={project} active="root/product" onSelect={() => {}} />,
    );

    expect(markup).toContain("aria-label=\"Federated projects\"");
    expect(markup).toContain(">root</code>");
    expect(markup).toContain(">product</code>");
    expect(markup).toContain(">api</code>");
    expect(markup).toContain("rl-project-node active");
  });

  test("derives chart values from semantic lists", () => {
    const markup = renderFragment([
      {
        type: "element",
        tag: "relic-chart",
        attributes: { type: "bar", title: "Corpus" },
        children: [
          {
            type: "element",
            tag: "ul",
            attributes: {},
            children: [
              {
                type: "element",
                tag: "li",
                attributes: {},
                children: [{ type: "text", value: "Specs: 4" }],
              },
              {
                type: "element",
                tag: "li",
                attributes: {},
                children: [{ type: "text", value: "ADRs — 2" }],
              },
            ],
          },
        ],
      },
    ]);

    expect(markup).toContain("<svg");
    expect(markup.match(/<rect /g)?.length).toBe(2);
    expect(markup).not.toContain("NaN");
  });

  test("preserves boolean HTML semantics", () => {
    const markup = renderFragment([
      {
        type: "element",
        tag: "details",
        attributes: { open: "" },
        children: [{ type: "text", value: "Visible" }],
      },
      {
        type: "element",
        tag: "ol",
        attributes: { reversed: "" },
        children: [
          {
            type: "element",
            tag: "li",
            attributes: {},
            children: [{ type: "text", value: "Last first" }],
          },
        ],
      },
    ]);

    expect(markup).toContain("<details open=\"\"");
    expect(markup).toContain("<ol reversed=\"\"");
  });

  test("lays reverse flow directions out in reverse", () => {
    const lr = renderToStaticMarkup(<Flow source={"flowchart LR\nA --> B"} />);
    const rl = renderToStaticMarkup(<Flow source={"flowchart RL\nA --> B"} />);
    const td = renderToStaticMarkup(<Flow source={"flowchart TD\nA --> B"} />);
    const bt = renderToStaticMarkup(<Flow source={"flowchart BT\nA --> B"} />);

    expect(rectanglePositions(lr)).toEqual([26, 176]);
    expect(rectanglePositions(rl)).toEqual([176, 26]);
    expect(lr).not.toBe(rl);
    expect(td).not.toBe(bt);
  });

  test("enhances a readable natural-language flow chain", () => {
    const markup = renderToStaticMarkup(
      <Flow
        source={
          "Developer request -> relevant project knowledge -> proportional roast ->\n" +
          "requested analysis or code -> validation -> optional developer-approved persistence"
        }
      />,
    );

    expect(markup).toContain("<svg");
    expect(markup).not.toContain("<pre>");
    expect(markup.match(/<rect /g)?.length).toBe(6);
    expect(markup.match(/<line /g)?.length).toBe(5);
  });

  test("renders malformed repository image paths as local evidence", () => {
    expect(resolveRelativePath("knowledge/specs/001/index.html", "%")).toBeUndefined();

    const ast: MarkdownAstNode[] = [
      { type: "image", href: "%", text: "broken image" },
    ];
    const markup = renderToStaticMarkup(
      <Markdown ast={ast} links={[]} sourcePath="knowledge/specs/001/index.html" />,
    );
    expect(markup).toContain("image unavailable: broken image");
    expect(markup).not.toContain("<img");
  });

  test("identifies an unavailable embedded HTML image when alt text is empty", () => {
    const markup = renderMarkdown([{
      type: "html_element",
      tag: "img",
      attributes: { src: "%", alt: "" },
      children: [],
    }]);

    expect(markup).toContain("image unavailable: %");
  });

  test("renders embedded HTML disclosures with their Markdown content", () => {
    const markup = renderMarkdown([
      {
        type: "html_element",
        tag: "details",
        attributes: { open: "" },
        children: [
          {
            type: "html_element",
            tag: "summary",
            attributes: {},
            children: [{ type: "text", text: "Import" }],
          },
          {
            type: "list",
            ordered: true,
            children: [
              {
                type: "list_item",
                children: [{ type: "text", text: "An admin opens the catalog." }],
              },
            ],
          },
        ],
      },
    ]);

    expect(markup).toContain("<details open=\"\"");
    expect(markup).toContain("<summary>Import</summary>");
    expect(markup).toContain("<ol><li>");
    expect(markup).not.toContain("&lt;details&gt;");
  });

  test("routes embedded HTML anchors through knowledge navigation", () => {
    const markup = renderMarkdown([
      {
        type: "html_element",
        tag: "a",
        attributes: { href: "../decisions/ADR-001.md" },
        children: [{ type: "text", text: "the decision" }],
      },
    ], [
      {
        sourcePath: "records/FR-001.md",
        href: "../decisions/ADR-001.md",
        text: "the decision",
        status: "missing",
      },
    ]);

    expect(markup).toContain("rl-broken-link");
  });

  test("routes federated links and artifact content with structured ownership", () => {
    const project: ProjectAddress = ["root", "backend"];
    const source = { project: ["root"] as ProjectAddress, path: "root.md" };
    const target = { project, path: "knowledge/notes/NOTE-001.md" };
    const anchor = renderToStaticMarkup(
      <KnowledgeAnchor
        href="../backend/knowledge/notes/NOTE-001.md#impact"
        relation={{
          source,
          target,
          resolved: target,
          href: "../backend/knowledge/notes/NOTE-001.md#impact",
          text: "Backend note",
          fragment: "impact",
          status: "canonical",
        }}
      >
        Backend note
      </KnowledgeAnchor>,
    );
    const image = renderToStaticMarkup(
      <Markdown
        ast={[{ type: "image", href: "diagram.png", text: "Diagram" }]}
        links={[]}
        sourcePath="knowledge/specs/001/index.html"
        project={project}
      />,
    );

    expect(anchor).toContain(
      "/document/knowledge/notes/NOTE-001.md?project=root%2Fbackend#impact",
    );
    expect(image).toContain("project=root%2Fbackend");
    expect(artifactContentUrl("evidence.txt", true, project)).toBe(
      "/api/content?path=evidence.txt&project=root%2Fbackend&download=1",
    );
    expect(documentRoute("note.md", project)).toBe(
      "/document/note.md?project=root%2Fbackend",
    );
    expect(projectFromLocation("?project=root%2Fbackend")).toBe("root/backend");
  });

  test("renders project metadata by shape instead of as encoded JSON", () => {
    const markup = renderToStaticMarkup(
      <Metadata
        metadata={{
          id: "FR-0004",
          supersedes: [],
          see_also: ["BR-0004", "GL-0003"],
          nested: [["alpha", "beta"]],
          acceptance_criteria: [
            { id: 1, priority: "must", text: `A ${"long ".repeat(20)}criterion.` },
          ],
        }}
      />,
    );

    expect(markup).not.toContain("[{&quot;");
    expect(markup).toContain(">BR-0004<");
    expect(markup).toContain(">GL-0003<");
    expect(markup).toContain("rl-meta-empty");
    expect(markup).toContain("<dt>priority</dt>");
    expect(markup).toContain("rl-meta-collection");
    expect(markup).toContain("rl-chip tone-slate");
    expect(markup).toContain("criterion.");
  });

  test("keeps deeply nested metadata bounded, formatted, and available on demand", () => {
    let deep: Record<string, unknown> = { m: "too deep" };
    for (const key of ["l", "k", "j", "i", "h", "g", "f", "e", "d", "c", "b", "a"]) {
      deep = { [key]: deep };
    }
    const markup = renderToStaticMarkup(<Metadata metadata={deep} />);

    expect(markup).toContain("<dt>l</dt>");
    expect(markup).toContain("<details class=\"rl-meta-overflow\">");
    expect(markup).toContain("Show deeply nested value");
    expect(markup).toContain("&quot;m&quot;: &quot;too deep&quot;");
    expect(markup).toContain("too deep");
  });

  test("decodes shareable knowledge routes without throwing", () => {
    expect(pathFromRoute(
      "/document/knowledge/specs/001-auth/index.html",
      "/document/",
    )).toBe("knowledge/specs/001-auth/index.html");
    expect(pathFromRoute("/artifact/%", "/artifact/")).toBeUndefined();
    expect(pathFromRoute("/document/", "/document/")).toBeUndefined();
  });

  test("preserves Markdown navigation and table semantics", () => {
    const ast: MarkdownAstNode[] = [
      {
        type: "heading",
        depth: 2,
        children: [{ type: "text", text: "Current boundary" }],
      },
      {
        type: "list",
        ordered: true,
        start: 4,
        children: [
          {
            type: "list_item",
            children: [{ type: "text", text: "Fourth" }],
          },
        ],
      },
      {
        type: "table",
        children: [
          {
            type: "table_header",
            children: [
              {
                type: "table_cell",
                align: "right",
                children: [{ type: "text", text: "Count" }],
              },
            ],
          },
        ],
      },
      {
        type: "link",
        href: "https://example.com",
        title: "Evidence",
        children: [{ type: "text", text: "source" }],
      },
    ];
    const markup = renderToStaticMarkup(
      <Markdown ast={ast} links={[]} sourcePath="knowledge/shared/current.md" />,
    );

    expect(markup).toContain('<h2 id="current-boundary">');
    expect(markup).toContain('<ol start="4">');
    expect(markup).toContain('style="text-align:right"');
    expect(markup).toContain('title="Evidence"');
  });

  test("keeps unknown callout kinds visually neutral", () => {
    expect(renderToStaticMarkup(<Callout type="project-specific">Readable</Callout>))
      .toContain("rl-callout neutral");
  });
});
