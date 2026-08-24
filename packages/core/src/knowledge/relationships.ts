import { realpathSync } from "node:fs";
import { resolve } from "node:path";

import { compareProjectAddress, compareText } from "./address.ts";
import type {
  FederatedArtifact,
  FederatedDocument,
  FederatedKnowledgeLink,
  FederatedKnowledgeReference,
  FederationProjectNode,
  KnowledgeLink,
  ProjectAddress,
} from "./types.ts";

interface FederatedTarget {
  reference: FederatedKnowledgeReference;
  type: "document" | "artifact";
}

function addressKey(address: ProjectAddress): string {
  return address.join("/");
}

function referenceKey(reference: FederatedKnowledgeReference): string {
  return `${addressKey(reference.project)}\0${reference.path}`;
}

function reference(
  project: ProjectAddress,
  path: string,
): FederatedKnowledgeReference {
  return { project, path };
}

function isDescendant(
  ancestor: ProjectAddress,
  candidate: ProjectAddress,
): boolean {
  return candidate.length > ancestor.length &&
    ancestor.every((segment, index) => candidate[index] === segment);
}

function compareReferences(
  left: FederatedKnowledgeReference,
  right: FederatedKnowledgeReference,
): number {
  return compareProjectAddress(left.project, right.project) ||
    compareText(left.path, right.path);
}

function physicalPath(
  projectRoot: string,
  projectRelativePath: string,
): string | undefined {
  try {
    return realpathSync(resolve(projectRoot, projectRelativePath));
  } catch {
    return undefined;
  }
}

function promoteDescendantTarget(
  project: ProjectAddress,
  projectRoot: string,
  resolvedPath: string,
  targetsByRealPath: Map<string, FederatedTarget[]>,
): FederatedTarget | undefined {
  const realPath = physicalPath(projectRoot, resolvedPath);
  if (!realPath) return undefined;

  const descendants = (targetsByRealPath.get(realPath) ?? [])
    .filter((target) => isDescendant(project, target.reference.project));
  return descendants.length === 1 ? descendants[0] : undefined;
}

function composeLink(
  source: FederatedKnowledgeReference,
  projectRoot: string,
  local: KnowledgeLink,
  targetsByRealPath: Map<string, FederatedTarget[]>,
): FederatedKnowledgeLink {
  let status = local.status;
  let resolved = local.resolvedPath
    ? reference(source.project, local.resolvedPath)
    : undefined;
  let target = local.targetPath
    ? reference(source.project, local.targetPath)
    : undefined;

  if (local.status === "artifact" && local.resolvedPath) {
    target = reference(source.project, local.resolvedPath);
  } else if (local.status === "project-file" && local.resolvedPath) {
    const descendant = promoteDescendantTarget(
      source.project,
      projectRoot,
      local.resolvedPath,
      targetsByRealPath,
    );
    if (descendant) {
      status = descendant.type === "document" ? "canonical" : "artifact";
      resolved = descendant.reference;
      target = descendant.reference;
    }
  }

  return {
    source,
    href: local.href,
    text: local.text,
    ...(local.fragment !== undefined && { fragment: local.fragment }),
    ...(resolved !== undefined && { resolved }),
    ...(target !== undefined && { target }),
    status,
  };
}

export function composeFederatedRelationships(
  projects: FederationProjectNode[],
  projectRoots: ReadonlyMap<string, string>,
): { documents: FederatedDocument[]; artifacts: FederatedArtifact[] } {
  const documents: FederatedDocument[] = projects.flatMap((node) =>
    node.knowledge.documents.map((document) => ({
      project: node.address,
      document,
      links: [],
      backlinks: [],
    }))
  ).sort((left, right) =>
    compareProjectAddress(left.project, right.project) ||
    compareText(left.document.path, right.document.path)
  );
  const artifacts: FederatedArtifact[] = projects.flatMap((node) =>
    node.knowledge.artifacts.map((artifact) => ({
      project: node.address,
      artifact,
      specifications: artifact.specificationPaths.map((path) =>
        reference(node.address, path)
      ),
    }))
  ).sort((left, right) =>
    compareProjectAddress(left.project, right.project) ||
    compareText(left.artifact.path, right.artifact.path)
  );

  const targetsByRealPath = new Map<string, FederatedTarget[]>();
  const addTarget = (
    project: ProjectAddress,
    path: string,
    type: FederatedTarget["type"],
  ): void => {
    const root = projectRoots.get(addressKey(project));
    if (!root) return;
    const realPath = physicalPath(root, path);
    if (!realPath) return;
    const targets = targetsByRealPath.get(realPath) ?? [];
    targets.push({ reference: reference(project, path), type });
    targetsByRealPath.set(realPath, targets);
  };
  for (const item of documents) {
    addTarget(item.project, item.document.path, "document");
  }
  for (const item of artifacts) {
    addTarget(item.project, item.artifact.path, "artifact");
  }

  const documentByReference = new Map(
    documents.map((item) => [
      referenceKey(reference(item.project, item.document.path)),
      item,
    ]),
  );
  for (const item of documents) {
    const root = projectRoots.get(addressKey(item.project));
    if (!root) continue;
    const source = reference(item.project, item.document.path);
    item.links = item.document.links.map((link) =>
      composeLink(source, root, link, targetsByRealPath)
    );
  }

  const backlinkKeys = new Set<string>();
  for (const item of documents) {
    for (const link of item.links) {
      if (link.status !== "canonical" || !link.target) continue;
      const key = `${referenceKey(link.source)}\0${referenceKey(link.target)}`;
      if (backlinkKeys.has(key)) continue;
      backlinkKeys.add(key);
      const targetDocument = documentByReference.get(referenceKey(link.target));
      if (!targetDocument) continue;
      targetDocument.backlinks.push({
        source: link.source,
        target: link.target,
        href: link.href,
        text: link.text,
        ...(link.fragment !== undefined && { fragment: link.fragment }),
      });
    }
  }
  for (const item of documents) {
    item.backlinks.sort((left, right) =>
      compareReferences(left.source, right.source) ||
      compareReferences(left.target, right.target) ||
      compareText(left.href, right.href)
    );
  }

  return { documents, artifacts };
}
