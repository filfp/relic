import { join } from "path";
import { readdirSync } from "fs";
import {
  findRelicDir,
  fileExists,
  dirExists,
  readText,
  writeText,
  readMode,
} from "@relic/utility";
import { TEMPLATES } from "../generated/templates.ts";
import { rebaseSpecHtml, embedMarkdownSources } from "../core/html-rebase.ts";

export interface HtmlSyncOptions {
  spec?: string;
  text?: boolean;
  relicDir?: string;
}

export type SpecSyncStatus = "synced" | "unchanged" | "missing" | "skipped";

export interface HtmlSyncResult {
  mode: "md" | "html";
  base_html_updated: boolean;
  specs: Array<{ spec: string; file: string; status: SpecSyncStatus }>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Write `.relic/base.html` from the embedded template (component library
 * reference copy). Returns true when the file was created or its content
 * changed.
 */
export function refreshBaseHtml(relicDir: string): boolean {
  const dest = join(relicDir, "base.html");
  const rendered = (TEMPLATES["base.html"] ?? "")
    .replace(/\{\{SPEC_ID\}\}/g, "base")
    .replace(/\{\{TITLE\}\}/g, "Relic Component Library")
    .replace(/\{\{DATE\}\}/g, today());
  const current = fileExists(dest) ? readText(dest) : null;
  if (current === rendered) return false;
  writeText(dest, rendered);
  return true;
}

/**
 * Re-base one spec's HTML file onto the current base template, preserving
 * its authored content, and refresh the embedded reader sources from the
 * spec's markdown files. Never overwrites a file it cannot parse.
 */
export function syncSpecHtml(specsDir: string, specId: string): SpecSyncStatus {
  const specDir = join(specsDir, specId);
  const htmlPath = join(specDir, `${specId}.html`);
  if (!fileExists(htmlPath)) return "missing";
  const oldHtml = readText(htmlPath);
  const rebased = rebaseSpecHtml(oldHtml, TEMPLATES["base.html"] ?? "", today());
  if (rebased === null) return "skipped";
  const md = (f: string) => (fileExists(join(specDir, f)) ? readText(join(specDir, f)) : "");
  const final = embedMarkdownSources(rebased, {
    spec: md("spec.md"),
    plan: md("plan.md"),
    tasks: md("tasks.md"),
  });
  if (final === oldHtml) return "unchanged";
  writeText(htmlPath, final);
  return "synced";
}

/** Sync every spec HTML (or a single spec) plus the base.html reference copy. */
export function syncAllSpecHtml(relicDir: string, onlySpec?: string): HtmlSyncResult {
  const mode = readMode(relicDir);
  const result: HtmlSyncResult = {
    mode,
    base_html_updated: false,
    specs: [],
  };
  if (mode !== "html") return result;

  result.base_html_updated = refreshBaseHtml(relicDir);

  const specsDir = join(relicDir, "specs");
  if (!dirExists(specsDir)) return result;

  const specIds = onlySpec
    ? [onlySpec]
    : readdirSync(specsDir)
        .filter((e) => dirExists(join(specsDir, e)))
        .sort();

  for (const specId of specIds) {
    result.specs.push({
      spec: specId,
      file: `specs/${specId}/${specId}.html`,
      status: syncSpecHtml(specsDir, specId),
    });
  }
  return result;
}

export async function runHtmlSync(options: HtmlSyncOptions): Promise<void> {
  const relicDir = options.relicDir ?? findRelicDir(process.cwd());
  if (!relicDir) {
    console.error("Error: not in a Relic project. Run: relic init");
    process.exit(1);
  }

  if (options.spec && !dirExists(join(relicDir, "specs", options.spec))) {
    console.error(`Error: spec "${options.spec}" not found in .relic/specs/`);
    process.exit(1);
  }

  const result = syncAllSpecHtml(relicDir, options.spec);

  if (result.mode !== "html") {
    if (options.text) {
      console.log("Mode is md — nothing to sync. Run `relic mode html` to enable HTML spec mode.");
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    return;
  }

  if (options.text) {
    console.log(
      result.base_html_updated
        ? "Updated .relic/base.html from the current template."
        : ".relic/base.html is up to date."
    );
    for (const s of result.specs) {
      const msg = {
        synced: "re-based onto current template",
        unchanged: "already up to date",
        missing: "no HTML file (run relic scaffold to create it)",
        skipped: "unrecognised structure — left untouched",
      }[s.status];
      console.log(`  ${s.file}: ${msg}`);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}
