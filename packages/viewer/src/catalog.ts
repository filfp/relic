import type { DocumentSummary } from "./api";
import type { KnowledgeTopology } from "@relic/core";

export interface CatalogGroup {
  key: string;
  memberships: string[];
  documents: DocumentSummary[];
}

export function membershipOptions(project: {
  topology?: KnowledgeTopology;
  documents: DocumentSummary[];
}): string[] {
  const declared = ["spec", "shared", ...Object.keys(project.topology?.records ?? {})];
  const present = project.documents.flatMap((document) => document.memberships);
  return [...new Set([...declared, ...present])]
    .filter((membership) => present.includes(membership));
}

export function catalogGroups(
  documents: DocumentSummary[],
  order: string[],
  activeMembership: string | null,
): CatalogGroup[] {
  const rank = new Map(order.map((membership, index) => [membership, index]));
  const groups = new Map<string, CatalogGroup>();
  for (const document of documents) {
    if (activeMembership && !document.memberships.includes(activeMembership)) continue;
    const memberships = [...document.memberships].sort((left, right) =>
      (rank.get(left) ?? order.length) - (rank.get(right) ?? order.length)
    );
    const key = memberships.join("+") || "unclassified";
    const group = groups.get(key) ?? { key, memberships, documents: [] };
    group.documents.push(document);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => {
    const leftRank = rank.get(left.memberships[0] ?? "") ?? order.length;
    const rightRank = rank.get(right.memberships[0] ?? "") ?? order.length;
    return leftRank - rightRank || left.key.localeCompare(right.key);
  });
}
