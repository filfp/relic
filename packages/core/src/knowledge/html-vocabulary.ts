import type { DefaultTreeAdapterTypes } from "parse5";

import type { HtmlAstNode, KnowledgeDiagnostic } from "./types.ts";

export const RELIC_TAGS = new Set([
  "relic-body",
  "relic-callout",
  "relic-flow",
  "relic-chart",
  "relic-chip",
]);

export const SAFE_TAGS = new Set([
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

export const UNSAFE_TAGS = new Set([
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

/** Elements that never hold children, so an absent end tag does not leave them open. */
export const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
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

export function isElement(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.Element {
  return "tagName" in node;
}

export function isText(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.TextNode {
  return node.nodeName === "#text";
}

export function isSafeNavigationUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("/")) return false;
  return true;
}

export function isSafeLocalMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return !trimmed.startsWith("//") && !trimmed.startsWith("/");
}

export function nodeText(nodes: HtmlAstNode[]): string {
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

export interface SanitizeContext {
  path: string;
  /** Relic components are canonical specification vocabulary, not Markdown vocabulary. */
  allowRelicComponents: boolean;
  diagnostics: KnowledgeDiagnostic[];
  links: Array<{ href: string; text: string }>;
}

function sanitizeAttributes(
  tag: string,
  element: DefaultTreeAdapterTypes.Element,
  context: SanitizeContext,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const attribute of element.attrs) {
    const name = attribute.name.toLowerCase();
    if (name === "style" || name === "srcdoc" || name.startsWith("on")) {
      context.diagnostics.push({
        code: "unsafe-html-attribute",
        severity: "warning",
        message: `Unsafe attribute "${name}" was removed from <${tag}>`,
        path: context.path,
      });
      continue;
    }

    const isProjectMetadata = name.startsWith("data-");
    const isAccessibility = name.startsWith("aria-");
    const isRelicHint = context.allowRelicComponents &&
      tag.startsWith("relic-") &&
      /^[a-z][a-z0-9-]*$/.test(name);
    const allowed = GLOBAL_ATTRIBUTES.has(name) ||
      TAG_ATTRIBUTES[tag]?.has(name) === true ||
      isProjectMetadata ||
      isAccessibility ||
      isRelicHint;
    if (!allowed) continue;

    if ((name === "href" || name === "cite") && !isSafeNavigationUrl(attribute.value)) {
      context.diagnostics.push({
        code: "unsafe-url",
        severity: "warning",
        message: `Unsafe link URL was removed from <${tag}>`,
        path: context.path,
        href: attribute.value,
      });
      continue;
    }
    if (name === "src" && !isSafeLocalMediaUrl(attribute.value)) {
      context.diagnostics.push({
        code: "unsafe-media-url",
        severity: "warning",
        message: "Only repository-relative media is loaded automatically",
        path: context.path,
        href: attribute.value,
      });
      continue;
    }
    attributes[name] = attribute.value;
  }
  return attributes;
}

/**
 * Convert parsed HTML children into the bounded semantic AST. Unsafe elements are
 * removed, unsupported wrappers are unwrapped while preserving readable content, and
 * anchors are reported so ordinary HTML links participate in the knowledge graph.
 */
export function sanitizeChildren(
  children: DefaultTreeAdapterTypes.ChildNode[],
  context: SanitizeContext,
): HtmlAstNode[] {
  const converted: HtmlAstNode[] = [];
  for (const child of children) {
    if (isText(child)) {
      if (child.value !== "") converted.push({ type: "text", value: child.value });
      continue;
    }
    if (!isElement(child)) continue;

    const tag = child.tagName.toLowerCase();
    if (UNSAFE_TAGS.has(tag)) {
      context.diagnostics.push({
        code: "unsafe-html",
        severity: "warning",
        message: `Unsafe <${tag}> content was removed`,
        path: context.path,
      });
      continue;
    }

    const isRelicComponent = tag.startsWith("relic-");
    const known = SAFE_TAGS.has(tag) ||
      (context.allowRelicComponents && RELIC_TAGS.has(tag));
    const nested = sanitizeChildren(child.childNodes, context);
    if (!known) {
      context.diagnostics.push({
        code: isRelicComponent && context.allowRelicComponents
          ? "unknown-relic-component"
          : "unsupported-html",
        severity: "warning",
        message: isRelicComponent && !context.allowRelicComponents
          ? `<${tag}> is canonical specification vocabulary and was removed while preserving its content`
          : `Unsupported <${tag}> wrapper was removed while preserving its content`,
        path: context.path,
      });
      converted.push(...nested);
      continue;
    }

    const attributes = sanitizeAttributes(tag, child, context);
    converted.push({ type: "element", tag, attributes, children: nested });
    if (tag === "a" && attributes.href) {
      context.links.push({ href: attributes.href, text: nodeText(nested) });
    }
  }
  return converted;
}
