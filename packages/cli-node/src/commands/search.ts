import {
  loadFederatedKnowledgeProject,
  searchFederatedKnowledge,
  searchKnowledge,
  type FederatedKnowledgeSearchResult,
  type KnowledgeDiagnostic,
  type KnowledgeSearchResult,
} from "@relic/core";

import { resolveRelicProjectDir } from "../project.ts";

export interface SearchOptions {
  query: string;
  json?: boolean;
  projectDir?: string;
}

export interface LocalSearchOutput {
  query: string;
  results: KnowledgeSearchResult[];
}

export interface FederatedSearchOutput {
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
  const query = options.query.trim();
  if (query === "") throw new Error("Search query cannot be empty");

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
      query,
      results: searchKnowledge(project, query),
    };
    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
      return output;
    }

    console.log(`Relic search: ${query} (${output.results.length} results)`);
    for (const result of output.results) {
      for (const line of humanResult(result)) console.log(line);
    }
    return output;
  }

  const output: FederatedSearchOutput = {
    query,
    results: searchFederatedKnowledge(aggregate, query),
  };
  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
    return output;
  }

  console.log(
    `Relic search: ${query} (${output.results.length} results across ${readableProjects.length} projects)`,
  );
  for (const result of output.results) {
    for (const line of humanFederatedResult(result)) console.log(line);
  }
  return output;
}
