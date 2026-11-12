import {
  buildSearchFilters,
  hasStructuralFilters,
  loadFederatedKnowledgeProject,
  SEARCH_FORMAT_VERSION,
  searchFederatedKnowledge,
  searchKnowledge,
  type FederatedKnowledgeSearchResult,
  type KnowledgeDiagnostic,
  type KnowledgeSearchResult,
} from "@relic/core";

import { resolveRelicProjectDir } from "../project.ts";

export interface SearchOptions {
  query?: string;
  /** Repeatable `--kind` values. */
  kinds?: string[];
  /** Repeatable `--meta` arguments, plain (`key`, `key=value`) or a JSON object. */
  meta?: string[];
  json?: boolean;
  projectDir?: string;
}

export interface LocalSearchOutput {
  formatVersion: typeof SEARCH_FORMAT_VERSION;
  query: string;
  results: KnowledgeSearchResult[];
}

export interface FederatedSearchOutput {
  formatVersion: typeof SEARCH_FORMAT_VERSION;
  query: string;
  results: FederatedKnowledgeSearchResult[];
}

export type SearchOutput = LocalSearchOutput | FederatedSearchOutput;

function diagnosticSummary(diagnostics: KnowledgeDiagnostic[]): string {
  return diagnostics
    .filter((item) => item.severity === "error")
    .map((item) => item.message)
    .join("; ");
}

function addressedPath(project: readonly string[], path: string): string {
  return `${project.join("/")} — ${path}`;
}

function humanResult(result: KnowledgeSearchResult): string[] {
  if (result.type === "document") {
    const identity = result.id ? `${result.id} — ${result.label}` : result.label;
    return [
      `[document] ${identity}`,
      `  path: ${result.path}`,
      `  memberships: ${result.memberships.join(", ")}`,
      ...(result.snippet ? [`  ${result.snippet}`] : []),
    ];
  }
  return [
    `[artifact] ${result.path}`,
    `  specifications: ${result.specificationPaths.join(", ")}`,
    ...(result.snippet ? [`  ${result.snippet}`] : []),
  ];
}

function humanFederatedResult(result: FederatedKnowledgeSearchResult): string[] {
  if (result.type === "document") {
    const identity = result.id ? `${result.id} — ${result.label}` : result.label;
    return [
      `[document] ${identity}`,
      `  project: ${result.project.join("/")}`,
      `  path: ${result.path}`,
      `  memberships: ${result.memberships.join(", ")}`,
      ...(result.snippet ? [`  ${result.snippet}`] : []),
    ];
  }
  return [
    `[artifact] ${result.path}`,
    `  project: ${result.project.join("/")}`,
    `  specifications: ${result.specifications.map((specification) =>
      addressedPath(specification.project, specification.path)
    ).join(", ")}`,
    ...(result.snippet ? [`  ${result.snippet}`] : []),
  ];
}

export async function runSearch(options: SearchOptions): Promise<SearchOutput> {
  const query = (options.query ?? "").trim();
  // Input errors surface before the project is read.
  const filters = buildSearchFilters(options.kinds, options.meta);
  if (query === "" && !hasStructuralFilters(filters)) {
    throw new Error("Provide a search query or at least one --kind/--meta filter");
  }
  const label = query === "" ? "(filters only)" : query;

  const projectDir = resolveRelicProjectDir(options.projectDir);
  const aggregate = loadFederatedKnowledgeProject(projectDir);
  const rootProject = aggregate.projects.find((node) =>
    node.address.length === 1 && node.address[0] === "root"
  );
  const readableProjects = aggregate.projects.filter((node) =>
    node.knowledge.topology !== undefined
  );
  if (!rootProject || readableProjects.length === 0) {
    const details = diagnosticSummary(
      aggregate.diagnostics.map((item) => item.diagnostic),
    );
    throw new Error(
      `Relic topology is unavailable${details ? `: ${details}` : ""}`,
    );
  }

  if (!rootProject.knowledge.federation) {
    const project = rootProject.knowledge;
    const output: LocalSearchOutput = {
      formatVersion: SEARCH_FORMAT_VERSION,
      query,
      results: searchKnowledge(project, query, filters),
    };
    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
      return output;
    }

    console.log(`Relic search: ${label} (${output.results.length} results)`);
    for (const result of output.results) {
      for (const line of humanResult(result)) console.log(line);
    }
    return output;
  }

  const output: FederatedSearchOutput = {
    formatVersion: SEARCH_FORMAT_VERSION,
    query,
    results: searchFederatedKnowledge(aggregate, query, filters),
  };
  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
    return output;
  }

  console.log(
    `Relic search: ${label} (${output.results.length} results across ${readableProjects.length} projects)`,
  );
  for (const result of output.results) {
    for (const line of humanFederatedResult(result)) console.log(line);
  }
  return output;
}
