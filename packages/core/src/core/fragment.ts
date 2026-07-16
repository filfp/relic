/**
 * Tolerant parser for spec/fix HTML fragments (spec 012, ViewerContract).
 *
 * A fragment is one <relic-body> root containing semantic tags. This parser
 * is the single implementation feeding two consumers: the viewer JSON API
 * (which renders the node tree) and `relic validate` (which reports lints).
 *
 * Tolerance is the core guarantee (NFR-3): malformed input NEVER throws —
 * it degrades into warning nodes/lints so one bad tag renders as one inline
 * warning, not a broken page.
 */

export type FragmentNode =
  | { kind: "text"; text: string }
  | {
      kind: "element";
      tag: string;
      attrs: Record<string, string>;
      children: FragmentNode[];
      /** Node-local problems (e.g. malformed JSON attr) — rendered inline. */
      warnings?: string[];
    }
  | { kind: "warning"; message: string; raw: string };

export interface FragmentLint {
  level: "error" | "warning";
  message: string;
}

export interface ParsedFragment {
  /** Children of <relic-body>. Never null — worst case an empty array. */
  body: FragmentNode[];
  lints: FragmentLint[];
  /** True when the file is a pre-012 full HTML document, not a fragment. */
  legacy: boolean;
}

/** Derived tags — self-closing; the server computes their content. */
export const DERIVED_TAGS = new Set([
  "relic-spec-meta",
  "relic-tasks",
  "relic-artifacts",
  "relic-changelog",
]);

/** Authored semantic tags (relic-progress kept for migration compatibility). */
export const AUTHORED_TAGS = new Set([
  "relic-section",
  "relic-callout",
  "relic-flow",
  "relic-chart",
  "relic-table",
  "relic-chip",
  "relic-status",
  "relic-progress",
]);

/** Plain prose subset allowed inside sections. */
export const PROSE_TAGS = new Set([
  "p", "ul", "ol", "li", "code", "pre", "strong", "em", "b", "i", "a",
  "br", "hr", "div", "span", "h1", "h2", "h3", "h4", "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
]);

/** Tags whose content is raw text (not parsed as markup). */
const RAW_TEXT_TAGS = new Set(["relic-flow"]);

const VOID_PROSE = new Set(["br", "hr"]);

/** Attributes expected to hold JSON — validated for early feedback. */
const JSON_ATTRS: Record<string, string[]> = {
  "relic-chart": ["labels", "data"],
  "relic-table": ["headers", "rows"],
};

const LEGACY_MARKERS = /<!DOCTYPE|<html[\s>]|<head[\s>]|<script[\s>]|<style[\s>]/i;

const TAG_RE = /^<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/)?>/;
const ATTR_RE = /([a-zA-Z-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of src.matchAll(ATTR_RE)) {
    // an unclosed opening quote (`x="y>`) falls through to the unquoted
    // branch with the quote char included — drop it to keep the intended value
    attrs[m[1]!] = (m[3] ?? m[4] ?? m[5] ?? "").replace(/^["']/, "");
  }
  return attrs;
}

export function isKnownTag(tag: string): boolean {
  return (
    tag === "relic-body" ||
    DERIVED_TAGS.has(tag) ||
    AUTHORED_TAGS.has(tag) ||
    PROSE_TAGS.has(tag)
  );
}

export function parseFragment(source: string): ParsedFragment {
  const lints: FragmentLint[] = [];
  const legacy = LEGACY_MARKERS.test(source);
  if (legacy) {
    lints.push({
      level: "error",
      message:
        "legacy full HTML document — not a <relic-body> fragment. Run: relic viewer-migrate",
    });
    return { body: [], lints, legacy };
  }

  type Open = { tag: string; attrs: Record<string, string>; children: FragmentNode[]; warnings?: string[] };
  const root: Open = { tag: "#root", attrs: {}, children: [] };
  const stack: Open[] = [root];
  const top = () => stack[stack.length - 1]!;

  const pushText = (text: string) => {
    if (text) top().children.push({ kind: "text", text });
  };

  const closeElement = (open: Open) => {
    const node: FragmentNode = {
      kind: "element",
      tag: open.tag,
      attrs: open.attrs,
      children: open.children,
    };
    if (open.warnings?.length) node.warnings = open.warnings;
    stack[stack.length - 1]!.children.push(node);
  };

  let i = 0;
  while (i < source.length) {
    const lt = source.indexOf("<", i);
    if (lt === -1) {
      pushText(source.slice(i));
      break;
    }
    pushText(source.slice(i, lt));

    // comments
    if (source.startsWith("<!--", lt)) {
      const end = source.indexOf("-->", lt + 4);
      i = end === -1 ? source.length : end + 3;
      continue;
    }

    const m = source.slice(lt).match(TAG_RE);
    if (!m) {
      // malformed tag — degrade to a warning node, resume after the next '>'
      const gt = source.indexOf(">", lt);
      const raw = source.slice(lt, gt === -1 ? Math.min(lt + 60, source.length) : gt + 1);
      top().children.push({ kind: "warning", message: "malformed tag", raw });
      lints.push({ level: "warning", message: `malformed tag: ${raw.slice(0, 60)}` });
      i = gt === -1 ? source.length : gt + 1;
      continue;
    }

    const [full, closing, tagRaw, attrSrc, selfClose] = m;
    const tag = tagRaw!.toLowerCase();
    i = lt + full!.length;

    if (closing) {
      // find the matching open element; auto-close anything in between
      const idx = stack.findLastIndex((o) => o.tag === tag);
      if (idx <= 0) {
        lints.push({ level: "warning", message: `stray closing tag </${tag}>` });
        continue;
      }
      while (stack.length > idx) {
        const open = stack.pop()!;
        if (stack.length >= idx && open.tag !== tag && open.tag !== "#root") {
          lints.push({ level: "warning", message: `auto-closed unclosed <${open.tag}>` });
        }
        if (open.tag !== "#root") closeElement(open);
      }
      continue;
    }

    const open: Open = { tag, attrs: parseAttrs(attrSrc ?? ""), children: [] };

    if (!isKnownTag(tag)) {
      open.warnings = [`unknown tag <${tag}>`];
      lints.push({ level: "warning", message: `unknown tag <${tag}>` });
    }
    for (const attr of JSON_ATTRS[tag] ?? []) {
      if (open.attrs[attr] !== undefined) {
        try {
          JSON.parse(open.attrs[attr]!);
        } catch {
          (open.warnings ??= []).push(`attribute "${attr}" is not valid JSON`);
          lints.push({ level: "warning", message: `<${tag}> attribute "${attr}" is not valid JSON` });
        }
      }
    }

    if (selfClose || DERIVED_TAGS.has(tag) || VOID_PROSE.has(tag)) {
      closeElement(open);
      continue;
    }

    if (RAW_TEXT_TAGS.has(tag)) {
      const closer = `</${tag}>`;
      const end = source.indexOf(closer, i);
      const raw = source.slice(i, end === -1 ? source.length : end);
      open.children.push({ kind: "text", text: raw });
      if (end === -1) {
        lints.push({ level: "warning", message: `unclosed <${tag}> — consumed to end of file` });
        i = source.length;
      } else {
        i = end + closer.length;
      }
      closeElement(open);
      continue;
    }

    stack.push(open);
  }

  // EOF: auto-close whatever is still open
  while (stack.length > 1) {
    const open = stack.pop()!;
    lints.push({ level: "warning", message: `auto-closed unclosed <${open.tag}> at end of file` });
    closeElement(open);
  }

  // root shape: exactly one <relic-body> (whitespace-only text around it is fine)
  const meaningful = root.children.filter(
    (n) => !(n.kind === "text" && n.text.trim() === "")
  );
  const bodyEl = meaningful.find((n) => n.kind === "element" && n.tag === "relic-body");
  if (!bodyEl || meaningful.length !== 1) {
    lints.push({
      level: bodyEl ? "warning" : "error",
      message: bodyEl
        ? "content outside <relic-body> is ignored"
        : "fragment must have a single <relic-body> root",
    });
  }
  const body = bodyEl && bodyEl.kind === "element" ? bodyEl.children : meaningful;

  return { body, lints, legacy: false };
}

/** Lint-only entry point for `relic validate`. */
export function lintFragment(source: string): FragmentLint[] {
  return parseFragment(source).lints;
}
