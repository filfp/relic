import { marked, type Token } from "marked";

import { parseFrontmatter } from "./frontmatter.ts";
import type {
  KnowledgeDiagnostic,
  MarkdownAstNode,
} from "./types.ts";

export interface ParsedMarkdown {
  metadata: Record<string, unknown>;
  body: string;
  ast: MarkdownAstNode[];
  title?: string;
  searchableText: string;
  links: Array<{ href: string; text: string }>;
  diagnostics: KnowledgeDiagnostic[];
}

function tokenChildren(token: Token): Token[] {
  const nested: Token[] = [];
  if ("tokens" in token && Array.isArray(token.tokens)) nested.push(...token.tokens);
  if (token.type === "list") {
    for (const item of token.items) nested.push(...item.tokens);
  }
  if (token.type === "table") {
    for (const cell of token.header) nested.push(...cell.tokens);
    for (const row of token.rows) {
      for (const cell of row) nested.push(...cell.tokens);
    }
  }
  return nested;
}

function isSafeLinkUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return !trimmed.startsWith("//") && !trimmed.startsWith("/");
}

function isSafeMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "" || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return !trimmed.startsWith("//") && !trimmed.startsWith("/");
}

function toAst(token: Token): MarkdownAstNode {
  const node: MarkdownAstNode = { type: token.type };
  if ("text" in token && typeof token.text === "string") node.text = token.text;
  if (token.type === "link" && isSafeLinkUrl(token.href)) {
    node.href = token.href;
    node.title = token.title;
  }
  if (token.type === "image" && isSafeMediaUrl(token.href)) {
    node.href = token.href;
    node.title = token.title;
  }
  if (token.type === "heading") node.depth = token.depth;
  if (token.type === "list") node.ordered = token.ordered;
  if (token.type === "list_item") node.checked = token.checked;
  const children = tokenChildren(token).map(toAst);
  if (children.length > 0) node.children = children;
  return node;
}

function plainText(tokens: Token[]): string {
  const parts: string[] = [];
  const visit = (token: Token) => {
    if (token.type === "code" || token.type === "codespan") {
      parts.push(token.text);
      return;
    }
    if (token.type === "html") {
      parts.push(token.text.replace(/<[^>]*>/g, " "));
      return;
    }
    const children = tokenChildren(token);
    if (children.length > 0) {
      for (const child of children) visit(child);
    } else if ("text" in token && typeof token.text === "string") {
      parts.push(token.text);
    }
  };
  for (const token of tokens) visit(token);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function parseMarkdown(source: string, path: string): ParsedMarkdown {
  const frontmatter = parseFrontmatter(source, path);
  const tokens = marked.lexer(frontmatter.body, { gfm: true });
  const links: Array<{ href: string; text: string }> = [];
  const diagnostics = [...frontmatter.diagnostics];
  let title: string | undefined;

  const visit = (token: Token) => {
    if (!title && token.type === "heading") title = token.text.trim();
    if (token.type === "link") {
      links.push({ href: token.href, text: token.text });
    }
    if (token.type === "image" && !isSafeMediaUrl(token.href)) {
      diagnostics.push({
        code: "unsafe-media-url",
        severity: "warning",
        message: "Only repository-relative media is loaded automatically",
        path,
        href: token.href,
      });
    }
    if (token.type === "html") {
      diagnostics.push({
        code: "markdown-raw-html",
        severity: "warning",
        message: "Raw HTML in canonical Markdown is treated as text",
        path,
      });
      return;
    }
    for (const child of tokenChildren(token)) visit(child);
  };
  for (const token of tokens) visit(token);

  return {
    metadata: frontmatter.metadata,
    body: frontmatter.body,
    ast: tokens.map(toAst),
    title,
    searchableText: plainText(tokens),
    links,
    diagnostics,
  };
}
