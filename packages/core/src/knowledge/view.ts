import { basename, resolve } from "node:path";

import { compareProjectAddress, compareText } from "./address.ts";
import { loadKnowledgeProject } from "./read-model.ts";
import { searchFederatedKnowledge, searchKnowledge } from "./search.ts";
import type {
  CanonicalDocument,
  CorpusMembership,
  DocumentFormat,
  FederatedArtifact,
  FederatedDocument,
  FederatedKnowledgeBacklink,
  FederatedKnowledgeDiagnostic,
  FederatedKnowledgeLink,
  FederatedKnowledgeProject,
  FederatedKnowledgeReference,
  FederatedKnowledgeSearchResult,
  FederationEdge,
  KnowledgeArtifact,
  KnowledgeDiagnostic,
  KnowledgeProject,
  KnowledgeSearchResult,
  KnowledgeTopology,
  ProjectAddress,
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

export interface FederatedKnowledgeDocumentSummary extends
  Omit<KnowledgeDocumentSummary, "outgoing" | "backlinks"> {
  project: ProjectAddress;
  outgoing: number;
  backlinks: number;
}

export interface FederatedKnowledgeArtifactSummary extends
  Omit<KnowledgeArtifactSummary, "specificationPaths"> {
  project: ProjectAddress;
  specifications: FederatedKnowledgeReference[];
}

export interface FederatedCanonicalDocument extends
  Omit<CanonicalDocument, "links" | "backlinks"> {
  project: ProjectAddress;
  links: FederatedKnowledgeLink[];
  backlinks: FederatedKnowledgeBacklink[];
}

export interface FederatedKnowledgeArtifact extends
  Omit<KnowledgeArtifact, "specificationPaths"> {
  project: ProjectAddress;
  specifications: FederatedKnowledgeReference[];
}

export interface FederatedKnowledgeDocumentView {
  document: FederatedCanonicalDocument;
  artifacts: FederatedKnowledgeArtifactSummary[];
  related: FederatedKnowledgeDocumentSummary[];
}

export interface FederatedKnowledgeArtifactView {
  artifact: FederatedKnowledgeArtifact;
  parents: FederatedKnowledgeDocumentSummary[];
}

export interface FederationProjectSummary {
  address: ProjectAddress;
  topology?: KnowledgeTopology;
  counts: {
    documents: number;
    artifacts: number;
    diagnostics: number;
    errors: number;
    warnings: number;
    orphans: number;
  };
}

export interface FederatedKnowledgeProjectView extends
  Omit<KnowledgeProjectView, "documents" | "artifacts" | "diagnostics"> {
  documents: FederatedKnowledgeDocumentSummary[];
  artifacts: FederatedKnowledgeArtifactSummary[];
  diagnostics: FederatedKnowledgeDiagnostic[];
  federation: {
    projects: FederationProjectSummary[];
    edges: FederationEdge[];
  };
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

function sameAddress(left: ProjectAddress, right: ProjectAddress): boolean {
  return compareProjectAddress(left, right) === 0;
}

function sameReference(
  left: FederatedKnowledgeReference,
  right: FederatedKnowledgeReference,
): boolean {
  return sameAddress(left.project, right.project) && left.path === right.path;
}

function federatedDocumentSummary(
  item: FederatedDocument,
): FederatedKnowledgeDocumentSummary {
  const summary = documentSummary(item.document);
  return {
    ...summary,
    project: item.project,
    outgoing: item.links.filter((link) => link.status === "canonical").length,
    backlinks: item.backlinks.length,
  };
}

function federatedArtifactSummary(
  item: FederatedArtifact,
): FederatedKnowledgeArtifactSummary {
  const { specificationPaths: _localSpecificationPaths, ...summary } =
    artifactSummary(item.artifact);
  return {
    ...summary,
    project: item.project,
    specifications: item.specifications,
  };
}

function projectCounts(project: KnowledgeProject): FederationProjectSummary["counts"] {
  return {
    documents: project.documents.length,
    artifacts: project.artifacts.length,
    diagnostics: project.diagnostics.length,
    errors: project.diagnostics.filter((item) => item.severity === "error").length,
    warnings: project.diagnostics.filter((item) => item.severity === "warning").length,
    orphans: project.diagnostics.filter((item) => item.code === "orphan-document").length,
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

export function federatedProjectView(
  projectPath: string,
  aggregate: FederatedKnowledgeProject,
): FederatedKnowledgeProjectView | undefined {
  const root = aggregate.projects.find((node) => node.address.length === 1);
  if (!root) return undefined;
  const local = projectView(projectPath, root.knowledge);
  return {
    ...local,
    documents: aggregate.documents.map(federatedDocumentSummary),
    artifacts: aggregate.artifacts.map(federatedArtifactSummary),
    diagnostics: aggregate.diagnostics,
    counts: {
      documents: aggregate.documents.length,
      artifacts: aggregate.artifacts.length,
      diagnostics: aggregate.diagnostics.length,
      errors: aggregate.diagnostics.filter((item) =>
        item.diagnostic.severity === "error"
      ).length,
      warnings: aggregate.diagnostics.filter((item) =>
        item.diagnostic.severity === "warning"
      ).length,
      orphans: aggregate.diagnostics.filter((item) =>
        item.diagnostic.code === "orphan-document"
      ).length,
    },
    federation: {
      projects: aggregate.projects.map((node) => ({
        address: node.address,
        ...(node.knowledge.topology !== undefined && {
          topology: node.knowledge.topology,
        }),
        counts: projectCounts(node.knowledge),
      })),
      edges: aggregate.edges,
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

export function federatedDocumentView(
  aggregate: FederatedKnowledgeProject,
  project: ProjectAddress,
  path: string,
): FederatedKnowledgeDocumentView | undefined {
  const item = aggregate.documents.find((candidate) =>
    sameAddress(candidate.project, project) && candidate.document.path === path
  );
  if (!item) return undefined;

  const related = new Map<string, FederatedKnowledgeReference>();
  for (const link of item.links) {
    if (link.status === "canonical" && link.target) {
      related.set(`${link.target.project.join("/")}\0${link.target.path}`, link.target);
    }
  }
  for (const backlink of item.backlinks) {
    related.set(
      `${backlink.source.project.join("/")}\0${backlink.source.path}`,
      backlink.source,
    );
  }
  const document: FederatedCanonicalDocument = {
    ...item.document,
    project: item.project,
    links: item.links,
    backlinks: item.backlinks,
  };
  const ownReference = { project: item.project, path: item.document.path };
  return {
    document,
    artifacts: aggregate.artifacts
      .filter((artifact) =>
        artifact.specifications.some((specification) =>
          sameReference(specification, ownReference)
        )
      )
      .map(federatedArtifactSummary),
    related: aggregate.documents
      .filter((candidate) =>
        related.has(`${candidate.project.join("/")}\0${candidate.document.path}`)
      )
      .map(federatedDocumentSummary)
      .sort((left, right) =>
        compareProjectAddress(left.project, right.project) ||
        compareText(left.path, right.path)
      ),
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

export function federatedArtifactView(
  aggregate: FederatedKnowledgeProject,
  project: ProjectAddress,
  path: string,
): FederatedKnowledgeArtifactView | undefined {
  const item = aggregate.artifacts.find((candidate) =>
    sameAddress(candidate.project, project) && candidate.artifact.path === path
  );
  if (!item) return undefined;
  const parents = new Set(
    item.specifications.map((specification) =>
      `${specification.project.join("/")}\0${specification.path}`
    ),
  );
  const { specificationPaths: _localSpecificationPaths, ...artifact } = item.artifact;
  return {
    artifact: {
      ...artifact,
      project: item.project,
      specifications: item.specifications,
    },
    parents: aggregate.documents
      .filter((document) =>
        parents.has(`${document.project.join("/")}\0${document.document.path}`)
      )
      .map(federatedDocumentSummary),
  };
}

export function searchView(
  project: KnowledgeProject,
  query: string,
): KnowledgeSearchResult[] {
  return searchKnowledge(project, query);
}

export function federatedSearchView(
  aggregate: FederatedKnowledgeProject,
  query: string,
): FederatedKnowledgeSearchResult[] {
  return searchFederatedKnowledge(aggregate, query);
}
