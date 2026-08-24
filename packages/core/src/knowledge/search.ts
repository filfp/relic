import { compareProjectAddress, compareText } from "./address.ts";
import type {
  CanonicalDocument,
  FederatedKnowledgeProject,
  FederatedKnowledgeSearchResult,
  KnowledgeArtifact,
  KnowledgeProject,
  KnowledgeSearchResult,
} from "./types.ts";

interface PreparedQuery {
  normalized: string;
  tokens: string[];
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en");
}

function snippet(source: string, normalizedQuery: string): string {
  const compact = source.replace(/\s+/g, " ").trim();
  if (compact === "") return "";
  const normalizedSource = normalize(compact);
  const firstToken = normalizedQuery.split(/\s+/)[0] ?? "";
  const match = firstToken ? normalizedSource.indexOf(firstToken) : 0;
  const start = Math.max(0, match < 0 ? 0 : match - 70);
  const end = Math.min(compact.length, start + 220);
  return `${start > 0 ? "…" : ""}${compact.slice(start, end)}${end < compact.length ? "…" : ""}`;
}

function tokenMatch(haystack: string, tokens: string[]): boolean {
  return tokens.every((token) => haystack.includes(token));
}

function prepareQuery(query: string): PreparedQuery | undefined {
  const normalized = normalize(query).trim();
  if (normalized === "") return undefined;
  return {
    normalized,
    tokens: normalized.split(/\s+/).filter(Boolean),
  };
}

function searchDocument(
  document: CanonicalDocument,
  query: PreparedQuery,
): Extract<KnowledgeSearchResult, { type: "document" }> | undefined {
  const identity = normalize([
    document.id ?? "",
    document.label,
    document.title ?? "",
    document.path,
    document.memberships.join(" "),
    JSON.stringify(document.metadata),
  ].join(" "));
  const content = normalize(document.searchableText);
  const haystack = `${identity} ${content}`;
  if (!tokenMatch(haystack, query.tokens)) return undefined;
  const score =
    query.tokens.filter((token) => identity.includes(token)).length * 10 +
    query.tokens.filter((token) => content.includes(token)).length;
  return {
    type: "document",
    path: document.path,
    label: document.label,
    ...(document.id !== undefined && { id: document.id }),
    memberships: document.memberships,
    snippet: snippet(document.searchableText, query.normalized),
    score,
  };
}

function searchArtifact(
  artifact: KnowledgeArtifact,
  query: PreparedQuery,
): Extract<KnowledgeSearchResult, { type: "artifact" }> | undefined {
  if (artifact.mediaType !== "text" || artifact.searchableText === undefined) {
    return undefined;
  }
  const identity = normalize(
    `${artifact.path} ${artifact.specificationPaths.join(" ")}`,
  );
  const content = normalize(artifact.searchableText);
  const haystack = `${identity} ${content}`;
  if (!tokenMatch(haystack, query.tokens)) return undefined;
  const score =
    query.tokens.filter((token) => identity.includes(token)).length * 5 +
    query.tokens.filter((token) => content.includes(token)).length;
  return {
    type: "artifact",
    path: artifact.path,
    specificationPaths: artifact.specificationPaths,
    snippet: snippet(artifact.searchableText, query.normalized),
    score,
  };
}

export function searchKnowledge(
  project: KnowledgeProject,
  query: string,
): KnowledgeSearchResult[] {
  const prepared = prepareQuery(query);
  if (!prepared) return [];
  const results: KnowledgeSearchResult[] = [];

  for (const document of project.documents) {
    const result = searchDocument(document, prepared);
    if (result) results.push(result);
  }

  for (const artifact of project.artifacts) {
    const result = searchArtifact(artifact, prepared);
    if (result) results.push(result);
  }

  return results.sort(
    (left, right) => right.score - left.score || left.path.localeCompare(right.path),
  );
}

export function searchFederatedKnowledge(
  aggregate: FederatedKnowledgeProject,
  query: string,
): FederatedKnowledgeSearchResult[] {
  const prepared = prepareQuery(query);
  if (!prepared) return [];
  const results: FederatedKnowledgeSearchResult[] = [];

  for (const { project, document } of aggregate.documents) {
    const result = searchDocument(document, prepared);
    if (result) results.push({ ...result, project });
  }
  for (const item of aggregate.artifacts) {
    const result = searchArtifact(item.artifact, prepared);
    if (result?.type === "artifact") {
      const { specificationPaths: _localSpecificationPaths, ...searchResult } = result;
      results.push({
        ...searchResult,
        project: item.project,
        specifications: item.specifications,
      });
    }
  }

  return results.sort((left, right) =>
    right.score - left.score ||
    compareProjectAddress(left.project, right.project) ||
    compareText(left.path, right.path)
  );
}
