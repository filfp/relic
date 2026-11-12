import { compareProjectAddress, compareText } from "./address.ts";
import {
  hasStructuralFilters,
  matchesFilters,
  type KnowledgeSearchFilters,
} from "./filters.ts";
import type {
  CanonicalDocument,
  FederatedKnowledgeProject,
  FederatedKnowledgeSearchResult,
  KnowledgeArtifact,
  KnowledgeProject,
  KnowledgeSearchResult,
} from "./types.ts";

/** Free-text query, absent when only structural filters select documents. */
type PreparedQuery = TextQuery | undefined;

interface TextQuery {
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
  filters: KnowledgeSearchFilters | undefined,
): Extract<KnowledgeSearchResult, { type: "document" }> | undefined {
  if (!matchesFilters(document, filters)) return undefined;
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
  if (query && !tokenMatch(haystack, query.tokens)) return undefined;
  const score = query
    ? query.tokens.filter((token) => identity.includes(token)).length * 10 +
      query.tokens.filter((token) => content.includes(token)).length
    : 0;
  return {
    type: "document",
    path: document.path,
    label: document.label,
    ...(document.id !== undefined && { id: document.id }),
    memberships: document.memberships,
    metadata: document.metadata,
    links: document.links,
    backlinks: document.backlinks,
    snippet: query ? snippet(document.searchableText, query.normalized) : "",
    score,
  };
}

function searchArtifact(
  artifact: KnowledgeArtifact,
  query: TextQuery,
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

/**
 * Free-text query and structural filters combine by AND. The query is optional when
 * at least one filter exists; with neither, nothing matches. Artifacts have no
 * memberships or metadata, so any filter excludes them.
 */
export function searchKnowledge(
  project: KnowledgeProject,
  query: string | undefined,
  filters?: KnowledgeSearchFilters,
): KnowledgeSearchResult[] {
  const prepared = prepareQuery(query ?? "");
  const filtered = hasStructuralFilters(filters);
  if (!prepared && !filtered) return [];
  const results: KnowledgeSearchResult[] = [];

  for (const document of project.documents) {
    const result = searchDocument(document, prepared, filters);
    if (result) results.push(result);
  }

  if (prepared && !filtered) {
    for (const artifact of project.artifacts) {
      const result = searchArtifact(artifact, prepared);
      if (result) results.push(result);
    }
  }

  return results.sort(
    (left, right) => right.score - left.score || left.path.localeCompare(right.path),
  );
}

export function searchFederatedKnowledge(
  aggregate: FederatedKnowledgeProject,
  query: string | undefined,
  filters?: KnowledgeSearchFilters,
): FederatedKnowledgeSearchResult[] {
  const prepared = prepareQuery(query ?? "");
  const filtered = hasStructuralFilters(filters);
  if (!prepared && !filtered) return [];
  const results: FederatedKnowledgeSearchResult[] = [];

  for (const { project, document, links, backlinks } of aggregate.documents) {
    const result = searchDocument(document, prepared, filters);
    if (result?.type === "document") {
      results.push({ ...result, project, links, backlinks });
    }
  }
  if (prepared && !filtered) {
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
  }

  return results.sort((left, right) =>
    right.score - left.score ||
    compareProjectAddress(left.project, right.project) ||
    compareText(left.path, right.path)
  );
}
