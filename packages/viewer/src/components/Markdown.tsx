import { createElement, type ReactNode } from "react";

import {
  artifactContentUrl,
  resolveRelativePath,
  type KnowledgeLink,
  type MarkdownAstNode,
  type ProjectAddress,
} from "../api";
import { reactAttributes, VOID_TAGS } from "./attributes";
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
  project,
}: {
  nodes: MarkdownAstNode[];
  links: KnowledgeLink[];
  sourcePath: string;
  project?: ProjectAddress;
}) {
  return nodes.map((node, index) => (
    <Node key={index} node={node} links={links} sourcePath={sourcePath} project={project} />
  ));
}

function Node({
  node,
  links,
  sourcePath,
  project,
}: {
  node: MarkdownAstNode;
  links: KnowledgeLink[];
  sourcePath: string;
  project?: ProjectAddress;
}): ReactNode {
  const children = node.children
    ? <Nodes nodes={node.children} links={links} sourcePath={sourcePath} project={project} />
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
          src={artifactContentUrl(resolved, false, project)}
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
                <Node key={index} node={child} links={links} sourcePath={sourcePath} project={project} />
              ))}
          </thead>
          <tbody>
            {node.children
              ?.filter((child) => child.type === "table_row")
              .map((child, index) => (
                <Node key={index} node={child} links={links} sourcePath={sourcePath} project={project} />
              ))}
          </tbody>
        </table>
      );
    case "table_header":
      return (
        <tr>
          {node.children?.map((cell, index) => (
            <th key={index} style={{ textAlign: cell.align }}>
              <Node node={cell} links={links} sourcePath={sourcePath} project={project} />
            </th>
          ))}
        </tr>
      );
    case "table_row":
      return (
        <tr>
          {node.children?.map((cell, index) => (
            <td key={index} style={{ textAlign: cell.align }}>
              <Node node={cell} links={links} sourcePath={sourcePath} project={project} />
            </td>
          ))}
        </tr>
      );
    case "table_cell":
      return children;
    case "html_element": {
      const tag = node.tag ?? "span";
      const attributes = node.attributes ?? {};
      if (tag === "a") {
        return (
          <KnowledgeAnchor
            href={attributes.href}
            relation={relationFor(links, attributes.href)}
            title={attributes.title}
          >
            {children}
          </KnowledgeAnchor>
        );
      }
      if (tag === "img") {
        const resolved = attributes.src
          ? resolveRelativePath(sourcePath, attributes.src)
          : undefined;
        return resolved ? (
          <img
            {...reactAttributes(attributes)}
            src={artifactContentUrl(resolved, false, project)}
            alt={attributes.alt ?? ""}
          />
        ) : (
          <span className="rl-warning">
            image unavailable: {attributes.alt?.trim() || attributes.src}
          </span>
        );
      }
      return createElement(
        tag,
        reactAttributes(attributes),
        VOID_TAGS.has(tag) ? undefined : children,
      );
    }
    default:
      return children;
  }
}

export function Markdown({
  ast,
  links,
  sourcePath,
  project,
}: {
  ast: MarkdownAstNode[];
  links: KnowledgeLink[];
  sourcePath: string;
  project?: ProjectAddress;
}) {
  return (
    <div className="rl-md">
      <Nodes nodes={ast} links={links} sourcePath={sourcePath} project={project} />
    </div>
  );
}
