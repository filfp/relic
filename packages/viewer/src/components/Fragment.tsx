import { createElement, type ReactNode } from "react";

import {
  artifactContentUrl,
  resolveRelativePath,
  type HtmlAstNode,
  type KnowledgeLink,
} from "../api";
import { Callout, Chip } from "./bits";
import { Chart } from "./Chart";
import { Flow } from "./Flow";
import { KnowledgeAnchor } from "./KnowledgeAnchor";

const VOID_TAGS = new Set(["br", "hr", "img"]);

function textOf(nodes: HtmlAstNode[]): string {
  return nodes
    .map((node) => node.type === "text" ? node.value : textOf(node.children))
    .join("")
    .trim();
}

function descendants(node: HtmlAstNode, tag: string): HtmlAstNode[] {
  if (node.type === "text") return [];
  return [
    ...(node.tag === tag ? [node] : []),
    ...node.children.flatMap((child) => descendants(child, tag)),
  ];
}

function chartData(node: Extract<HtmlAstNode, { type: "element" }>) {
  const rows = descendants(node, "tr")
    .map((row) =>
      row.type === "element"
        ? row.children
            .filter((cell) => cell.type === "element" && (cell.tag === "th" || cell.tag === "td"))
            .map((cell) => cell.type === "element" ? textOf(cell.children) : "")
        : [],
    )
    .filter((row) => row.length >= 2);
  if (rows.length > 0) {
    const bodyRows = rows.length > 1 ? rows.slice(1) : rows;
    return {
      labels: bodyRows.map((row) => row[0] ?? ""),
      values: bodyRows.map((row) => Number(row[1] ?? 0)),
    };
  }

  const entries = descendants(node, "li")
    .map((item) => item.type === "element" ? textOf(item.children) : "")
    .map((item) => item.match(/^(.*?)(?:\s*[:—-]\s*|\s+)(-?\d+(?:\.\d+)?)\s*$/))
    .filter((match): match is RegExpMatchArray => match !== null);
  return {
    labels: entries.map((entry) => entry[1]!.trim()),
    values: entries.map((entry) => Number(entry[2])),
  };
}

function relationFor(links: KnowledgeLink[], href: string | undefined) {
  return href === undefined ? undefined : links.find((link) => link.href === href);
}

function reactAttributes(attributes: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "href" || name === "src") continue;
    if (name === "colspan") result.colSpan = Number(value);
    else if (name === "rowspan") result.rowSpan = Number(value);
    else if (name === "datetime") result.dateTime = value;
    else if (name === "class") result.className = value;
    else if (name === "open" || name === "reversed") result[name] = true;
    else result[name] = value;
  }
  return result;
}

function Element({
  node,
  links,
  sourcePath,
}: {
  node: Extract<HtmlAstNode, { type: "element" }>;
  links: KnowledgeLink[];
  sourcePath: string;
}): ReactNode {
  const children = <Nodes nodes={node.children} links={links} sourcePath={sourcePath} />;
  const attributes = reactAttributes(node.attributes);

  if (node.tag === "relic-callout") {
    return <Callout type={node.attributes.kind ?? node.attributes.type}>{children}</Callout>;
  }
  if (node.tag === "relic-chip") {
    return <Chip color={node.attributes.color}>{textOf(node.children)}</Chip>;
  }
  if (node.tag === "relic-flow") {
    return (
      <div className="rl-enhancement">
        <Flow source={textOf(node.children)} />
        <details><summary>Flow source</summary><pre>{textOf(node.children)}</pre></details>
      </div>
    );
  }
  if (node.tag === "relic-chart") {
    const data = chartData(node);
    return (
      <div className="rl-enhancement">
        <Chart
          type={node.attributes.type}
          title={node.attributes.title}
          labels={data.labels}
          values={data.values}
        />
        {children}
      </div>
    );
  }
  if (node.tag === "a") {
    return (
      <KnowledgeAnchor
        href={node.attributes.href}
        relation={relationFor(links, node.attributes.href)}
      >
        {children}
      </KnowledgeAnchor>
    );
  }
  if (node.tag === "img") {
    if (!node.attributes.src) {
      return <span className="rl-warning">image unavailable: {node.attributes.alt ?? node.attributes.src}</span>;
    }
    const resolved = resolveRelativePath(sourcePath, node.attributes.src);
    if (!resolved) {
      return <span className="rl-warning">image unavailable: invalid repository path</span>;
    }
    return (
      <img
        {...attributes}
        src={artifactContentUrl(resolved)}
        alt={node.attributes.alt ?? ""}
      />
    );
  }

  return createElement(
    node.tag,
    attributes,
    VOID_TAGS.has(node.tag) ? undefined : children,
  );
}

function Nodes({
  nodes,
  links,
  sourcePath,
}: {
  nodes: HtmlAstNode[];
  links: KnowledgeLink[];
  sourcePath: string;
}) {
  return (
    <>
      {nodes.map((node, index) =>
        node.type === "text"
          ? node.value
          : <Element key={index} node={node} links={links} sourcePath={sourcePath} />,
      )}
    </>
  );
}

export function Fragment({
  nodes,
  links,
  sourcePath,
}: {
  nodes: HtmlAstNode[];
  links: KnowledgeLink[];
  sourcePath: string;
}) {
  return <div className="rl-spec"><Nodes nodes={nodes} links={links} sourcePath={sourcePath} /></div>;
}
