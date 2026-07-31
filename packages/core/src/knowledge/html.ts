import {
  parseFragment,
  type DefaultTreeAdapterTypes,
  type ParserError,
} from "parse5";

import type {
  HtmlAstNode,
  KnowledgeDiagnostic,
} from "./types.ts";

const RELIC_TAGS = new Set([
  "relic-body",
  "relic-callout",
  "relic-flow",
  "relic-chart",
  "relic-chip",
]);

const SAFE_TAGS = new Set([
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "main",
  "mark",
  "ol",
  "p",
  "pre",
  "progress",
  "q",
  "s",
  "samp",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
]);

const UNSAFE_TAGS = new Set([
  "applet",
  "audio",
  "canvas",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "source",
  "style",
  "svg",
  "template",
  "textarea",
  "video",
]);

const GLOBAL_ATTRIBUTES = new Set(["id", "title", "lang", "dir", "role"]);
const TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  blockquote: new Set(["cite"]),
  details: new Set(["open"]),
  img: new Set(["src", "alt", "width", "height"]),
  ins: new Set(["cite", "datetime"]),
  del: new Set(["cite", "datetime"]),
  ol: new Set(["start", "reversed", "type"]),
  progress: new Set(["max", "value"]),
  q: new Set(["cite"]),
  td: new Set(["colspan", "rowspan", "headers"]),
  th: new Set(["colspan", "rowspan", "headers", "scope"]),
  time: new Set(["datetime"]),
};

export interface ParsedSpecHtml {
  id?: string;
  title?: string;
  metadata: Record<string, unknown>;
  ast: HtmlAstNode[];
  searchableText: string;
  links: Array<{ href: string; text: string }>;
  diagnostics: KnowledgeDiagnostic[];
}

function isElement(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.Element {
  return "tagName" in node;
}

function isText(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.TextNode {
  return node.nodeName === "#text";
}

function isSafeNavigationUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("/")) return false;
  return true;
}

function isSafeLocalMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return !trimmed.startsWith("//") && !trimmed.startsWith("/");
}

function nodeText(nodes: HtmlAstNode[]): string {
  const parts: string[] = [];
  const visit = (node: HtmlAstNode) => {
    if (node.type === "text") {
      parts.push(node.value);
      return;
    }
    for (const child of node.children) visit(child);
  };
  for (const node of nodes) visit(node);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function parseSpecHtml(source: string, path: string): ParsedSpecHtml {
  const diagnostics: KnowledgeDiagnostic[] = [];
  const links: Array<{ href: string; text: string }> = [];
  const fragment = parseFragment(source, {
    sourceCodeLocationInfo: true,
    onParseError(error: ParserError) {
      diagnostics.push({
        code: "malformed-html",
        severity: "warning",
        message: `${error.code} at ${error.startLine}:${error.startCol}`,
        path,
      });
    },
  });

  const convertChildren = (
    children: DefaultTreeAdapterTypes.ChildNode[],
  ): HtmlAstNode[] => {
    const converted: HtmlAstNode[] = [];
    for (const child of children) {
      if (isText(child)) {
        if (child.value !== "") converted.push({ type: "text", value: child.value });
        continue;
      }
      if (!isElement(child)) continue;

      const tag = child.tagName.toLowerCase();
      if (UNSAFE_TAGS.has(tag)) {
        diagnostics.push({
          code: "unsafe-html",
          severity: "warning",
          message: `Unsafe <${tag}> content was removed`,
          path,
        });
        continue;
      }

      const known = SAFE_TAGS.has(tag) || RELIC_TAGS.has(tag);
      const nested = convertChildren(child.childNodes);
      if (!known) {
        diagnostics.push({
          code: tag.startsWith("relic-") ? "unknown-relic-component" : "unsupported-html",
          severity: "warning",
          message: `Unsupported <${tag}> wrapper was removed while preserving its content`,
          path,
        });
        converted.push(...nested);
        continue;
      }

      const attributes: Record<string, string> = {};
      for (const attribute of child.attrs) {
        const name = attribute.name.toLowerCase();
        if (
          name === "style" ||
          name === "srcdoc" ||
          name.startsWith("on")
        ) {
          diagnostics.push({
            code: "unsafe-html-attribute",
            severity: "warning",
            message: `Unsafe attribute "${name}" was removed from <${tag}>`,
            path,
          });
          continue;
        }

        const isProjectMetadata = name.startsWith("data-");
        const isAccessibility = name.startsWith("aria-");
        const isRelicHint = tag.startsWith("relic-") && /^[a-z][a-z0-9-]*$/.test(name);
        const allowed =
          GLOBAL_ATTRIBUTES.has(name) ||
          TAG_ATTRIBUTES[tag]?.has(name) === true ||
          isProjectMetadata ||
          isAccessibility ||
          isRelicHint;
        if (!allowed) continue;

        if ((name === "href" || name === "cite") && !isSafeNavigationUrl(attribute.value)) {
          diagnostics.push({
            code: "unsafe-url",
            severity: "warning",
            message: `Unsafe link URL was removed from <${tag}>`,
            path,
            href: attribute.value,
          });
          continue;
        }
        if (name === "src" && !isSafeLocalMediaUrl(attribute.value)) {
          diagnostics.push({
            code: "unsafe-media-url",
            severity: "warning",
            message: "Only repository-relative media is loaded automatically",
            path,
            href: attribute.value,
          });
          continue;
        }
        attributes[name] = attribute.value;
      }

      const node: HtmlAstNode = { type: "element", tag, attributes, children: nested };
      converted.push(node);
      if (tag === "a" && attributes.href) {
        links.push({ href: attributes.href, text: nodeText(nested) });
      }
    }
    return converted;
  };

  const topLevelElements = fragment.childNodes.filter(isElement);
  const meaningfulText = fragment.childNodes.some(
    (node) => isText(node) && node.value.trim() !== "",
  );
  const bodyElements = topLevelElements.filter(
    (element) => element.tagName.toLowerCase() === "relic-body",
  );
  const root = bodyElements[0];

  if (!root) {
    diagnostics.push({
      code: "missing-relic-body",
      severity: "error",
      message: "Canonical spec HTML must contain one <relic-body> root",
      path,
    });
  } else if (
    bodyElements.length !== 1 ||
    topLevelElements.length !== 1 ||
    meaningfulText
  ) {
    diagnostics.push({
      code: "invalid-relic-body-shape",
      severity: "warning",
      message: "Content outside the single <relic-body> root is ignored",
      path,
    });
  }

  const ast = root ? convertChildren(root.childNodes) : convertChildren(fragment.childNodes);
  const rootAttributes = root
    ? Object.fromEntries(root.attrs.map((attribute) => [attribute.name, attribute.value]))
    : {};
  if (root) {
    for (const attribute of root.attrs) {
      const name = attribute.name.toLowerCase();
      if (name === "style" || name === "srcdoc" || name.startsWith("on")) {
        diagnostics.push({
          code: "unsafe-html-attribute",
          severity: "warning",
          message: `Unsafe attribute "${name}" was removed from <relic-body>`,
          path,
        });
      }
    }
  }
  const id = typeof rootAttributes.id === "string" && rootAttributes.id.trim() !== ""
    ? rootAttributes.id.trim()
    : undefined;
  if (root && !id) {
    diagnostics.push({
      code: "missing-document-id",
      severity: "error",
      message: "<relic-body> requires a non-empty id",
      path,
    });
  }

  const metadata: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(rootAttributes)) {
    if (name.startsWith("data-")) metadata[name.slice(5)] = value;
  }

  let title: string | undefined;
  const findTitle = (nodes: HtmlAstNode[]) => {
    for (const node of nodes) {
      if (node.type === "element") {
        if (/^h[1-6]$/.test(node.tag)) {
          title = nodeText(node.children);
          if (title) return;
        }
        findTitle(node.children);
        if (title) return;
      }
    }
  };
  findTitle(ast);

  return {
    id,
    title,
    metadata,
    ast,
    searchableText: nodeText(ast),
    links,
    diagnostics,
  };
}
