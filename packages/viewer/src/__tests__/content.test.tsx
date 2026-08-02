import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { HtmlAstNode, KnowledgeLink, MarkdownAstNode } from "../api";
import { pathFromRoute, resolveRelativePath } from "../api";
import { Callout } from "../components/bits";
import { Flow } from "../components/Flow";
import { Fragment } from "../components/Fragment";
import { Markdown } from "../components/Markdown";
import { Metadata } from "../components/Metadata";

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

describe("Relic viewer content rendering", () => {
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
