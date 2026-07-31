import {
  loadKnowledgeProject,
  searchKnowledge,
  type KnowledgeDiagnostic,
  type KnowledgeSearchResult,
} from "@relic/core";

import { resolveRelicProjectDir } from "../project.ts";

export interface SearchOptions {
  query: string;
  json?: boolean;
  projectDir?: string;
}

export interface SearchOutput {
  query: string;
  results: KnowledgeSearchResult[];
}

function diagnosticSummary(diagnostics: KnowledgeDiagnostic[]): string {
  return diagnostics
    .filter((item) => item.severity === "error")
    .map((item) => item.message)
    .join("; ");
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

export async function runSearch(options: SearchOptions): Promise<SearchOutput> {
  const query = options.query.trim();
  if (query === "") throw new Error("Search query cannot be empty");

  const projectDir = resolveRelicProjectDir(options.projectDir);
  const project = loadKnowledgeProject(projectDir);
  if (!project.topology) {
    const details = diagnosticSummary(project.diagnostics);
    throw new Error(
      `Relic topology is unavailable${details ? `: ${details}` : ""}`,
    );
  }

  const output = {
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
