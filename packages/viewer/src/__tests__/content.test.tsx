import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { HtmlAstNode, MarkdownAstNode } from "../api";
import { pathFromRoute, resolveRelativePath } from "../api";
import { Callout } from "../components/bits";
import { Flow } from "../components/Flow";
import { Fragment } from "../components/Fragment";
import { Markdown } from "../components/Markdown";

function renderFragment(nodes: HtmlAstNode[]): string {
  return renderToStaticMarkup(
    <Fragment nodes={nodes} links={[]} sourcePath="knowledge/specs/001/index.html" />,
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
