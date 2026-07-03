/**
 * relic viewer-migrate — convert pre-012 full-document spec/fix HTML into
 * <relic-body> fragments (ViewerContract §Migration, OQ-3: best-effort with
 * lint flags for anything not mechanically mappable).
 */

import { join } from "path";
import { readdirSync, unlinkSync } from "fs";
import { findRelicDir, fileExists, dirExists, readText, writeText, availableSpecs } from "@relic/utility";
import { extractSpecHtmlParts } from "../core/html-rebase.ts";
import { parseFragment } from "../core/fragment.ts";

export interface MigrateOptions {
  text?: boolean;
  relicDir?: string;
}

export interface MigrateReport {
  converted: Array<{ file: string; lints: number }>;
  already_fragments: string[];
  failed: Array<{ file: string; reason: string }>;
  base_html_removed: boolean;
}

const LEGACY = /<!DOCTYPE|<html[\s>]|<head[\s>]|<script[\s>]|<style[\s>]/i;

/** Mechanical tag mapping: legacy content used <section> cards; everything
 *  else in the content region already speaks the relic-* tag names. */
function transformBody(inner: string): string {
  return inner
    .replace(/<section(\s[^>]*)?>/gi, "<relic-section>")
    .replace(/<\/section>/gi, "</relic-section>")
    .trim();
}

function migrateSpecHtml(html: string): string | null {
  const parts = extractSpecHtmlParts(html);
  if (!parts) return null;
  // parts.bodyBlock is `<div id="relic-body">…</div>` — take the inner
  const inner = parts.bodyBlock
    .replace(/^<div id="relic-body">/, "")
    .replace(/<\/div>\s*$/, "");
  return `<relic-body>\n<relic-spec-meta/>\n${transformBody(inner)}\n</relic-body>\n`;
}

function migrateFixHtml(html: string): string | null {
  // fix documents are free-form: prefer a #relic-body region, else <body>
  let inner: string | null = null;
  const parts = extractSpecHtmlParts(html);
  if (parts) {
    inner = parts.bodyBlock.replace(/^<div id="relic-body">/, "").replace(/<\/div>\s*$/, "");
  } else {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) inner = bodyMatch[1]!;
  }
  if (inner === null) return null;
  // strip chrome blocks that would trip legacy detection or add noise
  inner = inner
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<template[\s\S]*?<\/template>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "");
  return `<relic-body>\n${transformBody(inner)}\n</relic-body>\n`;
}

export function migrateProject(relicDir: string): MigrateReport {
  const report: MigrateReport = { converted: [], already_fragments: [], failed: [], base_html_removed: false };

  const specsDir = join(relicDir, "specs");
  for (const specId of availableSpecs(specsDir).sort()) {
    const htmlPath = join(specsDir, specId, `${specId}.html`);
    if (!fileExists(htmlPath)) continue;
    const rel = `specs/${specId}/${specId}.html`;
    const html = readText(htmlPath);
    if (!LEGACY.test(html)) {
      report.already_fragments.push(rel);
      continue;
    }
    const fragment = migrateSpecHtml(html);
    if (fragment === null) {
      report.failed.push({ file: rel, reason: "unrecognised structure — migrate manually" });
      continue;
    }
    writeText(htmlPath, fragment);
    report.converted.push({ file: rel, lints: parseFragment(fragment).lints.length });
  }

  const fixesDir = join(relicDir, "fixes");
  if (dirExists(fixesDir)) {
    for (const entry of readdirSync(fixesDir).sort()) {
      if (!entry.endsWith(".html")) continue;
      const htmlPath = join(fixesDir, entry);
      const rel = `fixes/${entry}`;
      const html = readText(htmlPath);
      if (!LEGACY.test(html)) {
        report.already_fragments.push(rel);
        continue;
      }
      const fragment = migrateFixHtml(html);
      if (fragment === null) {
        report.failed.push({ file: rel, reason: "unrecognised structure — migrate manually" });
        continue;
      }
      writeText(htmlPath, fragment);
      report.converted.push({ file: rel, lints: parseFragment(fragment).lints.length });
    }
  }

  // base.html carried the per-file chrome — the viewer replaced it entirely
  const baseHtml = join(relicDir, "base.html");
  if (fileExists(baseHtml)) {
    unlinkSync(baseHtml);
    report.base_html_removed = true;
  }

  return report;
}

export async function runViewerMigrate(options: MigrateOptions): Promise<void> {
  const relicDir = options.relicDir ?? findRelicDir(process.cwd());
  if (!relicDir) {
    console.error("Error: not in a Relic project. Run: relic init");
    process.exit(1);
  }
  const report = migrateProject(relicDir);
  if (options.text) {
    for (const c of report.converted) console.log(`converted  ${c.file}${c.lints ? `  (${c.lints} lint(s) — run relic validate)` : ""}`);
    for (const f of report.already_fragments) console.log(`fragment   ${f} (already migrated)`);
    for (const f of report.failed) console.log(`FAILED     ${f.file}: ${f.reason}`);
    if (report.base_html_removed) console.log("removed    .relic/base.html (superseded by the embedded viewer)");
    if (!report.converted.length && !report.failed.length) console.log("Nothing to migrate.");
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}
