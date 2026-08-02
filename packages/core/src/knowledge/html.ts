import { parseFragment, type ParserError } from "parse5";

import {
  isElement,
  isText,
  nodeText,
  sanitizeChildren,
  type SanitizeContext,
} from "./html-vocabulary.ts";
import type {
  HtmlAstNode,
  KnowledgeDiagnostic,
} from "./types.ts";

export interface ParsedSpecHtml {
  id?: string;
  title?: string;
  metadata: Record<string, unknown>;
  ast: HtmlAstNode[];
  searchableText: string;
  links: Array<{ href: string; text: string }>;
  diagnostics: KnowledgeDiagnostic[];
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

  const context: SanitizeContext = {
    path,
    allowRelicComponents: true,
    diagnostics,
    links,
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

  const ast = root
    ? sanitizeChildren(root.childNodes, context)
    : sanitizeChildren(fragment.childNodes, context);
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
