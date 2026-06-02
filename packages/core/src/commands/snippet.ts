import { SNIPPETS } from "@relic/engines";

const DIRECTIVE = /<!--\s*include:\s*relic\s+snippet\s+(\S+?)\s*-->/g;

function resolveSnippet(name: string, snippets: Record<string, string>, visiting: ReadonlySet<string>): string {
  if (visiting.has(name)) {
    process.stderr.write(`[snippet] Circular include: ${[...visiting, name].join(" → ")}\n`);
    process.exit(1);
  }
  if (snippets[name] === undefined) {
    process.stderr.write(`[snippet] Unknown snippet: ${name}\n`);
    process.exit(1);
  }
  const next = new Set(visiting).add(name);
  return snippets[name].replace(DIRECTIVE, (_, dep: string) => resolveSnippet(dep, snippets, next));
}

export function runSnippet(name: string): void {
  process.stdout.write(resolveSnippet(name, SNIPPETS, new Set()));
}
