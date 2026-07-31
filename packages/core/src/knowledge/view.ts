import { basename, resolve } from "node:path";

import { loadKnowledgeProject } from "./read-model.ts";
import { searchKnowledge } from "./search.ts";
import type {
  CanonicalDocument,
  CorpusMembership,
  DocumentFormat,
  KnowledgeArtifact,
  KnowledgeDiagnostic,
  KnowledgeProject,
  KnowledgeSearchResult,
  KnowledgeTopology,
} from "./types.ts";

export interface KnowledgeDocumentSummary {
  path: string;
  format: DocumentFormat;
  memberships: CorpusMembership[];
  id?: string;
  label: string;
  metadata: Record<string, unknown>;
  outgoing: number;
  backlinks: number;
  diagnostics: KnowledgeDiagnostic[];
}

export interface KnowledgeArtifactSummary {
  path: string;
  specificationPaths: string[];
  mediaType: "text" | "binary";
  diagnostics: KnowledgeDiagnostic[];
}

export interface KnowledgeProjectView {
  project: { name: string; path: string };
  topology?: KnowledgeTopology;
  documents: KnowledgeDocumentSummary[];
  artifacts: KnowledgeArtifactSummary[];
  diagnostics: KnowledgeDiagnostic[];
  counts: {
    documents: number;
    artifacts: number;
    diagnostics: number;
    errors: number;
    warnings: number;
    orphans: number;
  };
}

export interface KnowledgeDocumentView {
  document: CanonicalDocument;
  artifacts: KnowledgeArtifactSummary[];
  related: KnowledgeDocumentSummary[];
}

export interface KnowledgeArtifactView {
  artifact: KnowledgeArtifact;
  parents: KnowledgeDocumentSummary[];
}

function documentSummary(document: CanonicalDocument): KnowledgeDocumentSummary {
  return {
    path: document.path,
    format: document.format,
    memberships: document.memberships,
    ...(document.id !== undefined && { id: document.id }),
    label: document.label,
    metadata: document.metadata,
    outgoing: document.links.filter((link) => link.status === "canonical").length,
    backlinks: document.backlinks.length,
    diagnostics: document.diagnostics,
  };
}

function artifactSummary(artifact: KnowledgeArtifact): KnowledgeArtifactSummary {
  return {
    path: artifact.path,
    specificationPaths: artifact.specificationPaths,
    mediaType: artifact.mediaType,
    diagnostics: artifact.diagnostics,
  };
}

export function projectView(
  projectPath: string,
  project: KnowledgeProject = loadKnowledgeProject(projectPath),
): KnowledgeProjectView {
  const absolutePath = resolve(projectPath);
  return {
    project: {
      name: basename(absolutePath),
      path: absolutePath,
    },
    ...(project.topology !== undefined && { topology: project.topology }),
    documents: project.documents.map(documentSummary),
    artifacts: project.artifacts.map(artifactSummary),
    diagnostics: project.diagnostics,
    counts: {
      documents: project.documents.length,
      artifacts: project.artifacts.length,
      diagnostics: project.diagnostics.length,
      errors: project.diagnostics.filter((item) => item.severity === "error").length,
      warnings: project.diagnostics.filter((item) => item.severity === "warning").length,
      orphans: project.diagnostics.filter((item) => item.code === "orphan-document").length,
    },
  };
}

export function documentView(
  project: KnowledgeProject,
  path: string,
): KnowledgeDocumentView | undefined {
  const document = project.documents.find((candidate) => candidate.path === path);
  if (!document) return undefined;

  const relatedPaths = new Set<string>();
  for (const link of document.links) {
    if (link.status === "canonical" && link.targetPath) relatedPaths.add(link.targetPath);
  }
  for (const backlink of document.backlinks) relatedPaths.add(backlink.sourcePath);

  return {
    document,
    artifacts: project.artifacts
      .filter((artifact) => artifact.specificationPaths.includes(document.path))
      .map(artifactSummary),
    related: project.documents
      .filter((candidate) => relatedPaths.has(candidate.path))
      .map(documentSummary),
  };
}

export function artifactView(
  project: KnowledgeProject,
  path: string,
): KnowledgeArtifactView | undefined {
  const artifact = project.artifacts.find((candidate) => candidate.path === path);
  if (!artifact) return undefined;
  const parentPaths = new Set(artifact.specificationPaths);
  return {
    artifact,
    parents: project.documents
      .filter((document) => parentPaths.has(document.path))
      .map(documentSummary),
  };
}

export function searchView(
  project: KnowledgeProject,
  query: string,
): KnowledgeSearchResult[] {
  return searchKnowledge(project, query);
}
