import type {
  KnowledgeProject,
  KnowledgeSearchResult,
} from "./types.ts";

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

export function searchKnowledge(
  project: KnowledgeProject,
  query: string,
): KnowledgeSearchResult[] {
  const normalizedQuery = normalize(query).trim();
  if (normalizedQuery === "") return [];
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const results: KnowledgeSearchResult[] = [];

  for (const document of project.documents) {
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
    if (!tokenMatch(haystack, tokens)) continue;
    const score =
      tokens.filter((token) => identity.includes(token)).length * 10 +
      tokens.filter((token) => content.includes(token)).length;
    results.push({
      type: "document",
      path: document.path,
      label: document.label,
      ...(document.id !== undefined && { id: document.id }),
      memberships: document.memberships,
      snippet: snippet(document.searchableText, normalizedQuery),
      score,
    });
  }

  for (const artifact of project.artifacts) {
    if (artifact.mediaType !== "text" || artifact.searchableText === undefined) continue;
    const identity = normalize(
      `${artifact.path} ${artifact.specificationPaths.join(" ")}`,
    );
    const content = normalize(artifact.searchableText);
    const haystack = `${identity} ${content}`;
    if (!tokenMatch(haystack, tokens)) continue;
    const score =
      tokens.filter((token) => identity.includes(token)).length * 5 +
      tokens.filter((token) => content.includes(token)).length;
    results.push({
      type: "artifact",
      path: artifact.path,
      specificationPaths: artifact.specificationPaths,
      snippet: snippet(artifact.searchableText, normalizedQuery),
      score,
    });
  }

  return results.sort(
    (left, right) => right.score - left.score || left.path.localeCompare(right.path),
  );
}

