export type CorpusMembership =
  | "relic"
  | "spec"
  | "shared"
  | "fr"
  | "nfr"
  | "adr"
  | "epic";

export interface Diagnostic {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  path?: string;
  href?: string;
}

export interface MarkdownAstNode {
  type: string;
  text?: string;
  href?: string;
  title?: string | null;
  lang?: string;
  depth?: number;
  ordered?: boolean;
  checked?: boolean;
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

export interface KnowledgeLink {
  sourcePath: string;
  href: string;
  text: string;
  fragment?: string;
  resolvedPath?: string;
  targetPath?: string;
  status:
    | "canonical"
    | "artifact"
    | "project-file"
    | "missing"
    | "external"
    | "fragment"
    | "unsafe";
}

export interface KnowledgeBacklink {
  sourcePath: string;
  targetPath: string;
  href: string;
  text: string;
  fragment?: string;
}

export interface DocumentSummary {
  path: string;
  format: "markdown" | "spec-html";
  memberships: CorpusMembership[];
  id?: string;
  label: string;
  metadata: Record<string, unknown>;
  outgoing: number;
  backlinks: number;
  diagnostics: Diagnostic[];
}

export interface ArtifactSummary {
  path: string;
  specificationPaths: string[];
  mediaType: "text" | "binary";
  diagnostics: Diagnostic[];
}

export interface ProjectView {
  project: { name: string; path: string };
  documents: DocumentSummary[];
  artifacts: ArtifactSummary[];
  diagnostics: Diagnostic[];
  counts: {
    documents: number;
    artifacts: number;
    diagnostics: number;
    errors: number;
    warnings: number;
    orphans: number;
  };
}

export interface CanonicalDocument {
  path: string;
  format: "markdown" | "spec-html";
  memberships: CorpusMembership[];
  id?: string;
  label: string;
  metadata: Record<string, unknown>;
  diagnostics: Diagnostic[];
  title?: string;
  source: string;
  searchableText: string;
  markdownAst?: MarkdownAstNode[];
  htmlAst?: HtmlAstNode[];
  links: KnowledgeLink[];
  backlinks: KnowledgeBacklink[];
}

export interface DocumentView {
  document: CanonicalDocument;
  artifacts: ArtifactSummary[];
  related: DocumentSummary[];
}

export interface ArtifactView {
  artifact: ArtifactSummary & { searchableText?: string };
  parents: DocumentSummary[];
}

export type SearchResult =
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

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function query(path: string): string {
  return new URLSearchParams({ path }).toString();
}

export function documentRoute(path: string): string {
  return `/document/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function artifactRoute(path: string): string {
  return `/artifact/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export const fetchProject = () => get<ProjectView>("/api/project");
export const fetchDocument = (path: string) =>
  get<DocumentView>(`/api/document?${query(path)}`);
export const fetchArtifact = (path: string) =>
  get<ArtifactView>(`/api/artifact?${query(path)}`);
export const searchProject = (value: string) =>
  get<{ query: string; results: SearchResult[] }>(
    `/api/search?${new URLSearchParams({ q: value }).toString()}`,
  );

export function artifactContentUrl(path: string, download = false): string {
  const parameters = new URLSearchParams({ path });
  if (download) parameters.set("download", "1");
  return `/api/content?${parameters.toString()}`;
}

export function resolveRelativePath(sourcePath: string, reference: string): string {
  const base = new URL(`/project/${sourcePath}`, "https://relic.invalid");
  const resolved = new URL(reference, base);
  return decodeURIComponent(resolved.pathname.replace(/^\/project\//, ""));
}
