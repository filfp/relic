import { loadFederatedKnowledgeProject, type FederatedKnowledgeDiagnostic } from "@relic/core";

import { resolveRelicProjectDir } from "../project.ts";

export interface VerifyOptions {
  json?: boolean;
  projectDir?: string;
}

export interface VerifyOutput {
  diagnostics: FederatedKnowledgeDiagnostic[];
  valid: boolean;
}

function compareDiagnostics(
  left: FederatedKnowledgeDiagnostic,
  right: FederatedKnowledgeDiagnostic,
): number {
  return left.project.join("/").localeCompare(right.project.join("/")) ||
    (left.diagnostic.path ?? "").localeCompare(right.diagnostic.path ?? "") ||
    left.diagnostic.code.localeCompare(right.diagnostic.code) ||
    left.diagnostic.message.localeCompare(right.diagnostic.message);
}

function humanDiagnostic(item: FederatedKnowledgeDiagnostic): string[] {
  return [
    `[${item.diagnostic.severity}] ${item.project.join("/")}: ${item.diagnostic.message}`,
    ...(item.diagnostic.path ? [`  path: ${item.diagnostic.path}`] : []),
    ...(item.diagnostic.href ? [`  href: ${item.diagnostic.href}`] : []),
  ];
}

export async function runVerify(options: VerifyOptions): Promise<VerifyOutput> {
  const projectDir = resolveRelicProjectDir(options.projectDir);
  const aggregate = loadFederatedKnowledgeProject(projectDir);
  const diagnostics = aggregate.diagnostics
    .filter((item) => item.diagnostic.severity !== "info")
    .sort(compareDiagnostics);
  const output: VerifyOutput = {
    diagnostics,
    valid: diagnostics.length === 0,
  };

  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(
      `Relic verify: ${output.valid ? "passed" : "failed"} (${diagnostics.length} issue${diagnostics.length === 1 ? "" : "s"})`,
    );
    for (const diagnostic of diagnostics) {
      for (const line of humanDiagnostic(diagnostic)) console.log(line);
    }
  }
  return output;
}
