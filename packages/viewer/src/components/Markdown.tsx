import type { ReactNode } from "react";

import {
  artifactContentUrl,
  resolveRelativePath,
  type KnowledgeLink,
  type MarkdownAstNode,
} from "../api";
import { KnowledgeAnchor } from "./KnowledgeAnchor";

function relationFor(links: KnowledgeLink[], href: string | undefined) {
  return href === undefined ? undefined : links.find((link) => link.href === href);
}

function textOf(node: MarkdownAstNode): string {
  if (node.children) return node.children.map(textOf).join("");
  return node.text ?? "";
}

function headingId(node: MarkdownAstNode): string | undefined {
  const value = textOf(node)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s-]+/g, "-");
  return value || undefined;
}

function Nodes({
  nodes,
  links,
  sourcePath,
}: {
  nodes: MarkdownAstNode[];
  links: KnowledgeLink[];
  sourcePath: string;
}) {
  return nodes.map((node, index) => (
    <Node key={index} node={node} links={links} sourcePath={sourcePath} />
  ));
}

function Node({
  node,
  links,
  sourcePath,
}: {
  node: MarkdownAstNode;
  links: KnowledgeLink[];
  sourcePath: string;
}): ReactNode {
  const children = node.children
    ? <Nodes nodes={node.children} links={links} sourcePath={sourcePath} />
    : node.text;

  switch (node.type) {
    case "space":
      return null;
    case "text":
    case "escape":
      return children;
    case "paragraph":
      return <p>{children}</p>;
    case "heading": {
      const depth = Math.min(Math.max(node.depth ?? 2, 1), 6);
      const Tag = `h${depth}` as keyof React.JSX.IntrinsicElements;
      return <Tag id={headingId(node)}>{children}</Tag>;
    }
    case "strong":
      return <strong>{children}</strong>;
    case "em":
      return <em>{children}</em>;
    case "del":
      return <del>{children}</del>;
    case "codespan":
      return <code>{node.text}</code>;
    case "code":
      return (
        <pre>
          <code data-language={node.lang}>{node.text}</code>
        </pre>
      );
    case "blockquote":
      return <blockquote>{children}</blockquote>;
    case "hr":
      return <hr />;
    case "br":
      return <br />;
    case "link":
      return (
        <KnowledgeAnchor
          href={node.href}
          relation={relationFor(links, node.href)}
          title={node.title ?? undefined}
        >
          {children}
        </KnowledgeAnchor>
      );
    case "image": {
      if (!node.href) {
        return <span className="rl-warning">image unavailable: {node.text}</span>;
      }
      const resolved = resolveRelativePath(sourcePath, node.href);
      return resolved ? (
        <img
          src={artifactContentUrl(resolved)}
          alt={node.text ?? ""}
          title={node.title ?? undefined}
        />
      ) : (
        <span className="rl-warning">image unavailable: {node.text}</span>
      );
    }
    case "list": {
      return node.ordered
        ? <ol start={node.start}>{children}</ol>
        : <ul>{children}</ul>;
    }
    case "list_item":
      return (
        <li className={node.checked !== undefined ? "task" : undefined}>
          {node.checked !== undefined && (
            <input type="checkbox" disabled checked={node.checked} readOnly />
          )}{" "}
          {children}
        </li>
      );
    case "table":
      return (
        <table className="rl-table">
          <thead>
            {node.children
              ?.filter((child) => child.type === "table_header")
              .map((child, index) => (
                <Node key={index} node={child} links={links} sourcePath={sourcePath} />
              ))}
          </thead>
          <tbody>
            {node.children
              ?.filter((child) => child.type === "table_row")
              .map((child, index) => (
                <Node key={index} node={child} links={links} sourcePath={sourcePath} />
              ))}
          </tbody>
        </table>
      );
    case "table_header":
      return (
        <tr>
          {node.children?.map((cell, index) => (
            <th key={index} style={{ textAlign: cell.align }}>
              <Node node={cell} links={links} sourcePath={sourcePath} />
            </th>
          ))}
        </tr>
      );
    case "table_row":
      return (
        <tr>
          {node.children?.map((cell, index) => (
            <td key={index} style={{ textAlign: cell.align }}>
              <Node node={cell} links={links} sourcePath={sourcePath} />
            </td>
          ))}
        </tr>
      );
    case "table_cell":
      return children;
    case "html":
      return <pre className="rl-raw-html">{node.text}</pre>;
    default:
      return children;
  }
}

export function Markdown({
  ast,
  links,
  sourcePath,
}: {
  ast: MarkdownAstNode[];
  links: KnowledgeLink[];
  sourcePath: string;
}) {
  return (
    <div className="rl-md">
      <Nodes nodes={ast} links={links} sourcePath={sourcePath} />
    </div>
  );
}
