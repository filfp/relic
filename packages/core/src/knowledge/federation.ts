import { realpathSync } from "node:fs";
import { resolve } from "node:path";

import {
  compareCanonicalProjectAddress,
  compareProjectAddress,
  compareText,
} from "./address.ts";
import {
  readRelicProjectConfiguration,
  type RelicProjectConfigurationRead,
} from "./config.ts";
import { composeFederatedRelationships } from "./relationships.ts";
import { loadKnowledgeProjectFromConfiguration } from "./read-model.ts";
import type {
  FederatedKnowledgeDiagnostic,
  FederatedKnowledgeProject,
  FederatedDocument,
  FederationEdge,
  FederationProjectNode,
  KnowledgeArtifact,
  KnowledgeDiagnostic,
  ProjectAddress,
} from "./types.ts";

const ROOT_ADDRESS: ProjectAddress = ["root"];
const projectRootsByAggregate = new WeakMap<
  FederatedKnowledgeProject,
  ReadonlyMap<string, string>
>();

export interface FederatedArtifactAuthority {
  projectRoot: string;
  artifact: KnowledgeArtifact;
}

interface TraversalTask {
  address: ProjectAddress;
  projectRoot: string;
  read: RelicProjectConfigurationRead;
}

function childAddress(parent: ProjectAddress, key: string): ProjectAddress {
  return [...parent, key] as ProjectAddress;
}

function compareEdges(left: FederationEdge, right: FederationEdge): number {
  return compareProjectAddress(left.parent, right.parent) ||
    compareText(left.key, right.key) ||
    compareText(left.declaredPath ?? "", right.declaredPath ?? "");
}

function edgeDiagnostic(
  code: string,
  severity: "error" | "warning",
  message: string,
): KnowledgeDiagnostic {
  return { code, severity, message, path: "relic.yaml" };
}

function aggregateDiagnostics(
  projects: FederationProjectNode[],
  edges: FederationEdge[],
  documents: FederatedDocument[],
): FederatedKnowledgeDiagnostic[] {
  const edgeDiagnostics = new Set(
    edges.flatMap((edge) => edge.diagnostics),
  );
  const diagnostics: FederatedKnowledgeDiagnostic[] = [];

  for (const node of projects) {
    for (const diagnostic of node.knowledge.diagnostics) {
      if (edgeDiagnostics.has(diagnostic)) continue;
      diagnostics.push({ project: node.address, diagnostic });
    }
  }
  for (const edge of edges) {
    for (const diagnostic of edge.diagnostics) {
      diagnostics.push({
        project: edge.parent,
        edge: { parent: edge.parent, key: edge.key },
        diagnostic,
      });
    }
  }
  diagnostics.push(...federatedOutboundLinkDiagnostics(documents));

  return diagnostics.sort((left, right) =>
    compareProjectAddress(left.project, right.project) ||
    compareText(left.edge?.key ?? "", right.edge?.key ?? "") ||
    compareText(left.diagnostic.code, right.diagnostic.code) ||
    compareText(left.diagnostic.message, right.diagnostic.message)
  );
}

function isRelativeLinkPath(href: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("/")) {
    return false;
  }
  const beforeFragment = href.split("#", 1)[0] ?? "";
  const path = beforeFragment.split("?", 1)[0] ?? "";
  if (path === "") return false;
  try {
    decodeURIComponent(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds member-authored relative links rejected because they escape the member's own
 * project boundary. The local read model remains the authority that classifies a link
 * as unsafe; this adds federation-qualified maintenance evidence to the aggregate.
 */
function federatedOutboundLinkDiagnostics(
  documents: FederatedDocument[],
): FederatedKnowledgeDiagnostic[] {
  return documents.flatMap((item) => {
    if (item.project.length === 1) return [];
    return item.links.flatMap((link) => {
      if (link.status !== "unsafe" || !isRelativeLinkPath(link.href)) return [];
      return [{
        project: item.project,
        diagnostic: {
          code: "federated-outbound-link",
          severity: "warning" as const,
          message: `Relative link leaves federated project boundary: ${link.href}`,
          path: item.document.path,
          href: link.href,
        },
      }];
    });
  });
}

export function loadFederatedKnowledgeProject(
  selectedProjectPath: string,
): FederatedKnowledgeProject {
  const selectedRead = readRelicProjectConfiguration(selectedProjectPath);
  if (!selectedRead.projectRoot || !selectedRead.configuration) {
    return {
      projects: [],
      edges: [],
      documents: [],
      artifacts: [],
      diagnostics: selectedRead.diagnostics.map((diagnostic) => ({
        project: ROOT_ADDRESS,
        diagnostic,
      })),
    };
  }

  const projects: FederationProjectNode[] = [];
  const edges: FederationEdge[] = [];
  const projectRoots = new Map<string, string>();
  const readsByRealPath = new Map<string, RelicProjectConfigurationRead>([
    [selectedRead.projectRoot, selectedRead],
  ]);
  const canonicalAddressByRealPath = new Map<string, ProjectAddress>([
    [selectedRead.projectRoot, ROOT_ADDRESS],
  ]);
  const queue: TraversalTask[] = [{
    address: ROOT_ADDRESS,
    projectRoot: selectedRead.projectRoot,
    read: selectedRead,
  }];

  const readOnce = (projectRoot: string): RelicProjectConfigurationRead => {
    const existing = readsByRealPath.get(projectRoot);
    if (existing) return existing;
    const read = readRelicProjectConfiguration(projectRoot);
    readsByRealPath.set(projectRoot, read);
    return read;
  };

  while (queue.length > 0) {
    queue.sort((left, right) =>
      compareCanonicalProjectAddress(left.address, right.address)
    );
    const task = queue.shift()!;
    const knowledge = loadKnowledgeProjectFromConfiguration(task.read);
    projects.push({ address: task.address, knowledge });
    projectRoots.set(task.address.join("/"), task.projectRoot);

    const members = [...(task.read.configuration?.federation?.members ?? [])]
      .sort((left, right) =>
        compareText(left.key, right.key) ||
        compareText(left.declaredPath ?? "", right.declaredPath ?? "")
      );
    for (const member of members) {
      const candidateAddress = childAddress(task.address, member.key);
      if (!member.normalizedPath || member.diagnostics.length > 0) {
        edges.push({
          parent: task.address,
          key: member.key,
          ...(member.declaredPath !== undefined && {
            declaredPath: member.declaredPath,
          }),
          status: "invalid",
          diagnostics: member.diagnostics,
        });
        continue;
      }

      const requestedRoot = resolve(task.projectRoot, member.normalizedPath);
      let memberRoot: string;
      try {
        memberRoot = realpathSync(requestedRoot);
      } catch {
        edges.push({
          parent: task.address,
          key: member.key,
          declaredPath: member.declaredPath ?? member.normalizedPath,
          child: candidateAddress,
          status: "unavailable",
          diagnostics: [edgeDiagnostic(
            "unavailable-federation-member",
            "error",
            `Federation member "${member.key}" became unavailable during traversal`,
          )],
        });
        continue;
      }

      const alias = requestedRoot !== memberRoot;
      const canonicalAddress = canonicalAddressByRealPath.get(memberRoot);
      if (canonicalAddress) {
        edges.push({
          parent: task.address,
          key: member.key,
          declaredPath: member.declaredPath ?? member.normalizedPath,
          child: canonicalAddress,
          status: alias ? "noncanonical-alias" : "repeated",
          diagnostics: [edgeDiagnostic(
            alias ? "noncanonical-federation-alias" : "repeated-federation-member",
            "warning",
            alias
              ? `Federation member "${member.key}" is a filesystem alias of ${canonicalAddress.join("/")}`
              : `Federation member "${member.key}" repeats ${canonicalAddress.join("/")}`,
          )],
        });
        continue;
      }

      const memberRead = readOnce(memberRoot);
      if (!memberRead.configuration) {
        edges.push({
          parent: task.address,
          key: member.key,
          declaredPath: member.declaredPath ?? member.normalizedPath,
          child: candidateAddress,
          status: "unavailable",
          diagnostics: [
            edgeDiagnostic(
              "unavailable-federation-member",
              "error",
              `Federation member "${member.key}" has an unreadable relic.yaml`,
            ),
            ...memberRead.diagnostics,
          ],
        });
        continue;
      }

      canonicalAddressByRealPath.set(memberRoot, candidateAddress);
      const diagnostics = alias
        ? [edgeDiagnostic(
            "noncanonical-federation-alias",
            "warning",
            `Federation member "${member.key}" reaches its project through a filesystem alias`,
          )]
        : [];
      edges.push({
        parent: task.address,
        key: member.key,
        declaredPath: member.declaredPath ?? member.normalizedPath,
        child: candidateAddress,
        status: alias ? "noncanonical-alias" : "valid",
        diagnostics,
      });
      queue.push({
        address: candidateAddress,
        projectRoot: memberRoot,
        read: memberRead,
      });
    }
  }

  projects.sort((left, right) =>
    compareProjectAddress(left.address, right.address)
  );
  edges.sort(compareEdges);
  const { documents, artifacts } = composeFederatedRelationships(
    projects,
    projectRoots,
  );
  const aggregate: FederatedKnowledgeProject = {
    projects,
    edges,
    documents,
    artifacts,
    diagnostics: aggregateDiagnostics(projects, edges, documents),
  };
  projectRootsByAggregate.set(aggregate, new Map(projectRoots));
  return aggregate;
}

export function resolveFederatedArtifactAuthority(
  aggregate: FederatedKnowledgeProject,
  project: ProjectAddress,
  path: string,
): FederatedArtifactAuthority | undefined {
  const projectRoot = projectRootsByAggregate.get(aggregate)?.get(project.join("/"));
  if (!projectRoot) return undefined;
  const artifact = aggregate.artifacts.find((candidate) =>
    compareProjectAddress(candidate.project, project) === 0 &&
    candidate.artifact.path === path
  )?.artifact;
  return artifact ? { projectRoot, artifact } : undefined;
}
