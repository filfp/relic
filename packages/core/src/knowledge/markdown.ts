import { marked, type Token, type Tokens } from "marked";
import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";

import { parseFrontmatter } from "./frontmatter.ts";
import {
  isElement,
  SAFE_TAGS,
  sanitizeChildren,
  UNSAFE_TAGS,
  VOID_TAGS,
  type SanitizeContext,
} from "./html-vocabulary.ts";
import type {
  HtmlAstNode,
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

const LEADING_END_TAG = /^\s*<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/;
const TRAILING_END_TAG = /<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>\s*$/;

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

/**
 * Markdown emits raw HTML as unbalanced sibling tokens: an opening `<details>` block,
 * the Markdown it contains, then a closing `</details>` block. Splitting the end tags
 * that surround a token lets the builder pair them back into one nested element.
 */
function splitEndTags(text: string): {
  leading: string[];
  middle: string;
  trailing: string[];
} {
  const leading: string[] = [];
  const trailing: string[] = [];
  let middle = text;

  for (;;) {
    const match = middle.match(LEADING_END_TAG);
    if (!match) break;
    leading.push(match[1]!.toLowerCase());
    middle = middle.slice(match[0].length);
  }
  for (;;) {
    const match = middle.match(TRAILING_END_TAG);
    if (!match) break;
    trailing.unshift(match[1]!.toLowerCase());
    middle = middle.slice(0, match.index);
  }

  return { leading, middle, trailing };
}

/** Tag names of the rightmost chain of elements the token left open. */
function openChain(parent: DefaultTreeAdapterTypes.ParentNode): string[] {
  const chain: string[] = [];
  let current: DefaultTreeAdapterTypes.ParentNode = parent;
  for (;;) {
    const last = current.childNodes.filter(isElement).at(-1);
    if (!last) break;
    const tag = last.tagName.toLowerCase();
    if (VOID_TAGS.has(tag)) break;
    if (last.sourceCodeLocation?.endTag) break;
    chain.push(tag);
    current = last;
  }
  return chain;
}

function toMarkdownNodes(nodes: HtmlAstNode[]): MarkdownAstNode[] {
  return nodes.map((node) =>
    node.type === "text"
      ? { type: "text", text: node.value }
      : {
        type: "html_element",
        tag: node.tag,
        attributes: node.attributes,
        children: toMarkdownNodes(node.children),
      }
  );
}

interface Frame {
  tag?: string;
  children: MarkdownAstNode[];
}

/**
 * Turn an open chain into insertion frames over the sanitized nodes. An unsafe element
 * discards everything nested inside it, an unsupported wrapper is transparent so its
 * content still reaches the surrounding level, and a safe element receives its content.
 */
function openFrames(chain: string[], parent: MarkdownAstNode[]): Frame[] {
  const frames: Frame[] = [];
  let siblings = parent;
  let discarded = false;

  for (const tag of chain) {
    if (discarded || UNSAFE_TAGS.has(tag)) {
      discarded = true;
      frames.push({ tag, children: [] });
      continue;
    }
    if (!SAFE_TAGS.has(tag)) {
      frames.push({ tag, children: siblings });
      continue;
    }
    const candidate = siblings
      .filter((node) => node.type === "html_element" && node.tag === tag)
      .at(-1);
    if (!candidate) break;
    candidate.children ??= [];
    frames.push({ tag, children: candidate.children });
    siblings = candidate.children;
  }
  return frames;
}

function buildNodes(tokens: Token[], context: SanitizeContext): MarkdownAstNode[] {
  const root: MarkdownAstNode[] = [];
  const stack: Frame[] = [{ children: root }];

  const unbalanced = (message: string) => {
    context.diagnostics.push({
      code: "unbalanced-html",
      severity: "info",
      message,
      path: context.path,
    });
  };

  const close = (tag: string) => {
    for (let index = stack.length - 1; index > 0; index -= 1) {
      if (stack[index]!.tag === tag) {
        stack.length = index;
        return;
      }
    }
    unbalanced(`Closing </${tag}> has no matching open element`);
  };

  for (const token of tokens) {
    if (token.type === "space") continue;
    if (token.type !== "html") {
      stack.at(-1)!.children.push(toAst(token, context));
      continue;
    }

    const raw = "text" in token && typeof token.text === "string" ? token.text : "";
    const { leading, middle, trailing } = splitEndTags(raw);
    for (const tag of leading) close(tag);

    if (middle.trim() !== "") {
      const fragment = parseFragment(middle, { sourceCodeLocationInfo: true });
      const parent = stack.at(-1)!.children;
      parent.push(...toMarkdownNodes(sanitizeChildren(fragment.childNodes, context)));
      stack.push(...openFrames(openChain(fragment), parent));
    }

    for (const tag of trailing) close(tag);
  }

  for (let index = stack.length - 1; index > 0; index -= 1) {
    unbalanced(
      `Unclosed <${stack[index]!.tag}> kept the following content nested inside it`,
    );
  }
  return root;
}

function toAst(token: Token, context: SanitizeContext): MarkdownAstNode {
  const node: MarkdownAstNode = { type: token.type };
  if (token.type === "list") {
    const list = token as Tokens.List;
    node.ordered = list.ordered;
    if (typeof list.start === "number") node.start = list.start;
    node.children = list.items.map((item) => ({
      type: "list_item",
      checked: item.checked,
      children: buildNodes(item.tokens, context),
    }));
    return node;
  }
  if (token.type === "table") {
    const table = token as Tokens.Table;
    node.children = [
      {
        type: "table_header",
        children: table.header.map((cell, index) => ({
          type: "table_cell",
          ...(table.align[index] && { align: table.align[index]! }),
          children: buildNodes(cell.tokens, context),
        })),
      },
      ...table.rows.map((row) => ({
        type: "table_row",
        children: row.map((cell, index) => ({
          type: "table_cell",
          ...(table.align[index] && { align: table.align[index]! }),
          children: buildNodes(cell.tokens, context),
        })),
      })),
    ];
    return node;
  }
  if (token.type === "link" && isSafeLinkUrl(token.href)) {
    node.href = token.href;
    node.title = token.title;
  }
  if (token.type === "image" && isSafeMediaUrl(token.href)) {
    node.href = token.href;
    node.title = token.title;
  }
  if (token.type === "heading") node.depth = token.depth;
  if (token.type === "code" && token.lang) node.lang = token.lang;

  // Structured children are the rendered content; the token's flat text would only
  // duplicate them and would carry back the raw markup the vocabulary just removed.
  const children = buildNodes(tokenChildren(token), context);
  if (children.length > 0) node.children = children;
  else if ("text" in token && typeof token.text === "string") node.text = token.text;
  return node;
}

/**
 * Search text comes from the sanitized AST so the index and the viewer agree on what
 * the document actually contains: removed markup and unsafe content are absent from both.
 */
function astText(nodes: MarkdownAstNode[]): string {
  const parts: string[] = [];
  const visit = (node: MarkdownAstNode) => {
    if (node.type === "code" || node.type === "codespan") {
      if (node.text) parts.push(node.text);
      return;
    }
    if (node.children && node.children.length > 0) {
      for (const child of node.children) visit(child);
      return;
    }
    if (node.text) parts.push(node.text);
  };
  for (const node of nodes) visit(node);
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
    if (token.type === "html") return;
    for (const child of tokenChildren(token)) visit(child);
  };
  for (const token of tokens) visit(token);

  const ast = buildNodes(tokens, {
    path,
    allowRelicComponents: false,
    diagnostics,
    links,
  });

  return {
    metadata: frontmatter.metadata,
    body: frontmatter.body,
    ast,
    title,
    searchableText: astText(ast),
    links,
    diagnostics,
  };
}
