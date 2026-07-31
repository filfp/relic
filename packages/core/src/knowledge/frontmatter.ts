import { parseDocument } from "yaml";

import type { KnowledgeDiagnostic } from "./types.ts";

export interface ParsedFrontmatter {
  metadata: Record<string, unknown>;
  body: string;
  diagnostics: KnowledgeDiagnostic[];
  present: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseFrontmatter(source: string, path: string): ParsedFrontmatter {
  const normalized = source.replace(/^\uFEFF/, "");
  const match = normalized.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/);
  if (!match) {
    return { metadata: {}, body: normalized, diagnostics: [], present: false };
  }

  const yamlSource = match[1] ?? "";
  const document = parseDocument(yamlSource, {
    prettyErrors: true,
    strict: true,
    version: "1.2",
  });
  const diagnostics: KnowledgeDiagnostic[] = [
    ...document.errors.map((error) => ({
      code: "invalid-frontmatter",
      severity: "error" as const,
      message: error.message,
      path,
    })),
    ...document.warnings.map((warning) => ({
      code: "frontmatter-warning",
      severity: "warning" as const,
      message: warning.message,
      path,
    })),
  ];

  let metadata: Record<string, unknown> = {};
  if (document.errors.length === 0) {
    try {
      const value = document.toJS({ maxAliasCount: 0 });
      const record = asRecord(value);
      if (record) {
        metadata = record;
      } else if (value !== null) {
        diagnostics.push({
          code: "invalid-frontmatter-root",
          severity: "error",
          message: "YAML frontmatter must contain a mapping",
          path,
        });
      }
    } catch (error) {
      diagnostics.push({
        code: "unsafe-frontmatter-alias",
        severity: "error",
        message: error instanceof Error ? error.message : "YAML aliases are not supported",
        path,
      });
    }
  }

  return {
    metadata,
    body: normalized.slice(match[0].length),
    diagnostics,
    present: true,
  };
}
