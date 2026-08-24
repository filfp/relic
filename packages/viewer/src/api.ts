import type {
  CanonicalDocument as LocalCanonicalDocument,
  CorpusMembership,
  FederatedCanonicalDocument,
  FederatedKnowledgeArtifactSummary,
  FederatedKnowledgeArtifactView,
  FederatedKnowledgeBacklink,
  FederatedKnowledgeDiagnostic,
  FederatedKnowledgeDocumentSummary,
  FederatedKnowledgeDocumentView,
  FederatedKnowledgeLink,
  FederatedKnowledgeProjectView,
  FederatedKnowledgeSearchResult,
  HtmlAstNode,
  KnowledgeArtifactSummary as LocalArtifactSummary,
  KnowledgeArtifactView as LocalArtifactView,
  KnowledgeBacklink as LocalKnowledgeBacklink,
  KnowledgeDiagnostic,
  KnowledgeDocumentSummary as LocalDocumentSummary,
  KnowledgeDocumentView as LocalDocumentView,
  KnowledgeLink as LocalKnowledgeLink,
  KnowledgeProjectView as LocalProjectView,
  KnowledgeSearchResult as LocalSearchResult,
  MarkdownAstNode,
  ProjectAddress,
} from "@relic/core";

export type ArtifactSummary = LocalArtifactSummary | FederatedKnowledgeArtifactSummary;
export type ArtifactView = LocalArtifactView | FederatedKnowledgeArtifactView;
export type CanonicalDocument = LocalCanonicalDocument | FederatedCanonicalDocument;
export type Diagnostic = KnowledgeDiagnostic;
export type DocumentSummary = LocalDocumentSummary | FederatedKnowledgeDocumentSummary;
export type DocumentView = LocalDocumentView | FederatedKnowledgeDocumentView;
export type KnowledgeBacklink = LocalKnowledgeBacklink | FederatedKnowledgeBacklink;
export type KnowledgeLink = LocalKnowledgeLink | FederatedKnowledgeLink;
export type ProjectView = LocalProjectView | FederatedKnowledgeProjectView;
export type SearchResult = LocalSearchResult | FederatedKnowledgeSearchResult;

export type {
  CorpusMembership,
  HtmlAstNode,
  MarkdownAstNode,
  FederatedKnowledgeDiagnostic,
  FederatedKnowledgeProjectView,
  ProjectAddress,
};

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function serializedProject(project: ProjectAddress | string): string {
  return typeof project === "string" ? project : project.join("/");
}

function query(path: string, project?: ProjectAddress | string): string {
  const parameters = new URLSearchParams({ path });
  if (project) parameters.set("project", serializedProject(project));
  return parameters.toString();
}

function knowledgeRoute(
  kind: "document" | "artifact",
  path: string,
  project?: ProjectAddress,
): string {
  const pathname = `/${kind}/${path.split("/").map(encodeURIComponent).join("/")}`;
  return project
    ? `${pathname}?${new URLSearchParams({ project: project.join("/") })}`
    : pathname;
}

export function documentRoute(path: string, project?: ProjectAddress): string {
  return knowledgeRoute("document", path, project);
}

export function artifactRoute(path: string, project?: ProjectAddress): string {
  return knowledgeRoute("artifact", path, project);
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
export const fetchDocument = (path: string, project?: string) =>
  get<DocumentView>(`/api/document?${query(path, project)}`);
export const fetchArtifact = (path: string, project?: string) =>
  get<ArtifactView>(`/api/artifact?${query(path, project)}`);
export const searchProject = (value: string) =>
  get<{ query: string; results: SearchResult[] }>(
    `/api/search?${new URLSearchParams({ q: value }).toString()}`,
  );

export function artifactContentUrl(
  path: string,
  download = false,
  project?: ProjectAddress,
): string {
  const parameters = new URLSearchParams({ path });
  if (project) parameters.set("project", project.join("/"));
  if (download) parameters.set("download", "1");
  return `/api/content?${parameters.toString()}`;
}

export function projectFromLocation(search: string): string | undefined {
  return new URLSearchParams(search).get("project") ?? undefined;
}

export function isFederatedProjectView(
  project: ProjectView,
): project is FederatedKnowledgeProjectView {
  return "federation" in project;
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
