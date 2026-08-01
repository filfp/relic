export type RecordKind = string;

export type CorpusMembership = "spec" | "shared" | RecordKind;

export type DocumentFormat = "markdown" | "spec-html";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface KnowledgeDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  path?: string;
  href?: string;
}

export interface KnowledgeTopology {
  specs: string;
  shared: string;
  records: Record<RecordKind, string>;
}

export interface MarkdownAstNode {
  type: string;
  text?: string;
  href?: string;
  title?: string | null;
  lang?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  checked?: boolean;
  align?: "left" | "center" | "right";
  /** Set on "html_element" nodes produced by the safe embedded HTML vocabulary. */
  tag?: string;
  attributes?: Record<string, string>;
  children?: MarkdownAstNode[];
}

export type HtmlAstNode =
  | { type: "text"; value: string }
  | {
      type: "element";
      tag: string;
      attributes: Record<string, string>;
      children: HtmlAstNode[];
    };

export type LinkStatus =
  | "canonical"
  | "artifact"
  | "project-file"
  | "missing"
  | "external"
  | "fragment"
  | "unsafe";

export interface KnowledgeLink {
  sourcePath: string;
  href: string;
  text: string;
  fragment?: string;
  resolvedPath?: string;
  targetPath?: string;
  status: LinkStatus;
}

export interface KnowledgeBacklink {
  sourcePath: string;
  targetPath: string;
  href: string;
  text: string;
  fragment?: string;
}

export interface CanonicalDocument {
  path: string;
  format: DocumentFormat;
  memberships: CorpusMembership[];
  id?: string;
  title?: string;
  label: string;
  metadata: Record<string, unknown>;
  source: string;
  searchableText: string;
  markdownAst?: MarkdownAstNode[];
  htmlAst?: HtmlAstNode[];
  links: KnowledgeLink[];
  backlinks: KnowledgeBacklink[];
  diagnostics: KnowledgeDiagnostic[];
}

export interface KnowledgeArtifact {
  path: string;
  specificationPaths: string[];
  mediaType: "text" | "binary";
  searchableText?: string;
  diagnostics: KnowledgeDiagnostic[];
}

export interface KnowledgeProject {
  topology?: KnowledgeTopology;
  documents: CanonicalDocument[];
  artifacts: KnowledgeArtifact[];
  diagnostics: KnowledgeDiagnostic[];
}

export type KnowledgeSearchResult =
  | {
      type: "document";
      path: string;
      label: string;
      id?: string;
      memberships: CorpusMembership[];
      snippet: string;
      score: number;
    }
  | {
      type: "artifact";
      path: string;
      specificationPaths: string[];
      snippet: string;
      score: number;
    };
