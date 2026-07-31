import type {
  CanonicalDocument,
  CorpusMembership,
  HtmlAstNode,
  KnowledgeArtifactSummary as ArtifactSummary,
  KnowledgeArtifactView as ArtifactView,
  KnowledgeBacklink,
  KnowledgeDiagnostic as Diagnostic,
  KnowledgeDocumentSummary as DocumentSummary,
  KnowledgeDocumentView as DocumentView,
  KnowledgeLink,
  KnowledgeProjectView as ProjectView,
  KnowledgeSearchResult as SearchResult,
  MarkdownAstNode,
} from "@relic/core";

export type {
  ArtifactSummary,
  ArtifactView,
  CanonicalDocument,
  CorpusMembership,
  Diagnostic,
  DocumentSummary,
  DocumentView,
  HtmlAstNode,
  KnowledgeBacklink,
  KnowledgeLink,
  MarkdownAstNode,
  ProjectView,
  SearchResult,
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

export function pathFromRoute(
  pathname: string,
  prefix: "/document/" | "/artifact/",
): string | undefined {
  if (!pathname.startsWith(prefix)) return undefined;
  const encoded = pathname.slice(prefix.length);
  if (encoded === "") return undefined;
  try {
    return encoded.split("/").map(decodeURIComponent).join("/");
  } catch {
    return undefined;
  }
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

export function resolveRelativePath(
  sourcePath: string,
  reference: string,
): string | undefined {
  try {
    const base = new URL(`/project/${sourcePath}`, "https://relic.invalid");
    const resolved = new URL(reference, base);
    return decodeURIComponent(resolved.pathname.replace(/^\/project\//, ""));
  } catch {
    return undefined;
  }
}
