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

export interface FederationConfiguration {
  members: FederationMemberDeclaration[];
}

export interface FederationMemberDeclaration {
  key: string;
  declaredPath?: string;
  normalizedPath?: string;
  diagnostics: KnowledgeDiagnostic[];
}

export interface RelicProjectConfiguration {
  topology?: KnowledgeTopology;
  federation?: FederationConfiguration;
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
  federation?: FederationConfiguration;
  documents: CanonicalDocument[];
  artifacts: KnowledgeArtifact[];
  diagnostics: KnowledgeDiagnostic[];
}

export type ProjectAddress = readonly ["root", ...string[]];

export type FederationEdgeStatus =
  | "valid"
  | "invalid"
  | "unavailable"
  | "repeated"
  | "noncanonical-alias";

export interface FederationProjectNode {
  address: ProjectAddress;
  knowledge: KnowledgeProject;
}

export interface FederationEdge {
  parent: ProjectAddress;
  key: string;
  declaredPath?: string;
  child?: ProjectAddress;
  status: FederationEdgeStatus;
  diagnostics: KnowledgeDiagnostic[];
}

export interface FederatedKnowledgeDiagnostic {
  project: ProjectAddress;
  edge?: { parent: ProjectAddress; key: string };
  diagnostic: KnowledgeDiagnostic;
}

export interface FederatedKnowledgeReference {
  project: ProjectAddress;
  path: string;
}

export interface FederatedKnowledgeLink {
  source: FederatedKnowledgeReference;
  href: string;
  text: string;
  fragment?: string;
  resolved?: FederatedKnowledgeReference;
  target?: FederatedKnowledgeReference;
  status: LinkStatus;
}

export interface FederatedKnowledgeBacklink {
  source: FederatedKnowledgeReference;
  target: FederatedKnowledgeReference;
  href: string;
  text: string;
  fragment?: string;
}

export interface FederatedDocument {
  project: ProjectAddress;
  document: CanonicalDocument;
  links: FederatedKnowledgeLink[];
  backlinks: FederatedKnowledgeBacklink[];
}

export interface FederatedArtifact {
  project: ProjectAddress;
  artifact: KnowledgeArtifact;
  specifications: FederatedKnowledgeReference[];
}

export interface FederatedKnowledgeProject {
  projects: FederationProjectNode[];
  edges: FederationEdge[];
  documents: FederatedDocument[];
  artifacts: FederatedArtifact[];
  diagnostics: FederatedKnowledgeDiagnostic[];
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

export type FederatedKnowledgeSearchResult =
  | (Extract<KnowledgeSearchResult, { type: "document" }> & {
      project: ProjectAddress;
    })
  | (Omit<Extract<KnowledgeSearchResult, { type: "artifact" }>, "specificationPaths"> & {
      project: ProjectAddress;
      specifications: FederatedKnowledgeReference[];
    });
