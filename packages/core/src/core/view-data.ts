/**
 * Data layer for the spec viewer (spec 012). Pure read-only functions over
 * the .relic/ folder — the JSON API in `relic serve` is a thin shell around
 * these, and everything is computed per request from the real files (derived
 * components can never be stale).
 */

import { join } from "path";
import { readdirSync } from "fs";
import {
  fileExists,
  dirExists,
  readText,
  readJson,
  readMode,
  resolveExternalRead,
} from "@relic/utility";
import { availableSpecs } from "@relic/utility";
import { parseFragment, type FragmentLint, type FragmentNode } from "./fragment.ts";
import { loadRegistry } from "./artifact-registry.ts";
import type { ArtifactsJson } from "../types.ts";

export interface TaskPhase {
  title: string;
  done: number;
  total: number;
  items: Array<{ text: string; done: boolean }>;
}

export interface DerivedData {
  meta: { id: string; title: string; status: string; created: string | null };
  tasks: { done: number; total: number; phases: TaskPhase[] };
  artifacts: Array<{ path: string; role: "owns" | "reads"; exists: boolean }>;
  external_reads: Array<{ entry: string; exists: boolean }>;
  changelog: Array<{ heading: string; body: string }>;
}

const read = (p: string): string | null => (fileExists(p) ? readText(p) : null);

export function parseSpecHeader(specMd: string | null, id: string) {
  const title =
    specMd?.match(/^# Spec:\s*(.+)$/m)?.[1]?.trim() ??
    id.slice(4).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const status = specMd?.match(/^\*\*Status:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "draft";
  const created = specMd?.match(/^\*\*Created:\*\*\s*([0-9-]+)/m)?.[1] ?? null;
  return { title, status, created };
}

export function parseTaskPhases(tasksMd: string | null): { done: number; total: number; phases: TaskPhase[] } {
  if (!tasksMd) return { done: 0, total: 0, phases: [] };
  const phases: TaskPhase[] = [];
  let current: TaskPhase | null = null;
  let done = 0;
  let total = 0;
  for (const line of tasksMd.split("\n")) {
    const ph = line.match(/^###\s+(.+)$/);
    if (ph) {
      current = { title: ph[1]!.replace(/\s*\(.*\)\s*$/, "").trim(), done: 0, total: 0, items: [] };
      phases.push(current);
      continue;
    }
    const tm = line.match(/^- \[( |x|X)\]\s*(.+)$/);
    if (tm) {
      const isDone = tm[1]!.toLowerCase() === "x";
      const text = tm[2]!.replace(/\*\*/g, "").trim();
      total++;
      if (isDone) done++;
      if (!current) {
        current = { title: "Tasks", done: 0, total: 0, items: [] };
        phases.push(current);
      }
      current.total++;
      if (isDone) current.done++;
      current.items.push({ text, done: isDone });
    }
  }
  return { done, total, phases: phases.filter((p) => p.total > 0) };
}

function changelogFor(relicDir: string, specId: string): Array<{ heading: string; body: string }> {
  const log = read(join(relicDir, "changelog.md"));
  if (!log) return [];
  const entries: Array<{ heading: string; body: string }> = [];
  const blocks = log.split(/^## /m).slice(1);
  for (const block of blocks) {
    const [headingLine, ...rest] = block.split("\n");
    const heading = (headingLine ?? "").trim();
    const body = rest.join("\n").trim();
    if (heading.includes(specId) || body.includes(specId)) {
      entries.push({ heading, body });
    }
  }
  return entries.reverse(); // newest first
}

export function specDerived(relicDir: string, specId: string): DerivedData {
  const specDir = join(relicDir, "specs", specId);
  const specMd = read(join(specDir, "spec.md"));
  const header = parseSpecHeader(specMd, specId);

  const artifacts: DerivedData["artifacts"] = [];
  const externalReads: DerivedData["external_reads"] = [];
  const artifactsPath = join(specDir, "artifacts.json");
  if (fileExists(artifactsPath)) {
    try {
      const art = readJson<ArtifactsJson & { external_reads?: string[] }>(artifactsPath);
      for (const p of art.owns ?? []) artifacts.push({ path: p, role: "owns", exists: fileExists(join(relicDir, p)) });
      for (const p of art.reads ?? []) artifacts.push({ path: p, role: "reads", exists: fileExists(join(relicDir, p)) });
      for (const entry of art.external_reads ?? []) {
        try {
          externalReads.push({ entry, exists: resolveExternalRead(relicDir, entry).exists });
        } catch {
          externalReads.push({ entry, exists: false });
        }
      }
    } catch {
      // malformed artifacts.json — surfaced by validate, not the viewer
    }
  }

  return {
    meta: { id: specId, ...header },
    tasks: parseTaskPhases(read(join(specDir, "tasks.md"))),
    artifacts,
    external_reads: externalReads,
    changelog: changelogFor(relicDir, specId),
  };
}

export function specDetail(relicDir: string, specId: string) {
  const specDir = join(relicDir, "specs", specId);
  if (!dirExists(specDir)) return null;
  const html = read(join(specDir, `${specId}.html`));
  const parsed = html ? parseFragment(html) : { body: [] as FragmentNode[], lints: [] as FragmentLint[], legacy: false };
  const derived = specDerived(relicDir, specId);
  return {
    id: specId,
    title: derived.meta.title,
    status: derived.meta.status,
    fragment: parsed.body,
    lints: parsed.lints,
    files: {
      spec: read(join(specDir, "spec.md")),
      plan: read(join(specDir, "plan.md")),
      tasks: read(join(specDir, "tasks.md")),
    },
    derived,
  };
}

export function fixDetail(relicDir: string, fixId: string) {
  const htmlPath = join(relicDir, "fixes", `${fixId}.html`);
  const mdPath = join(relicDir, "fixes", `${fixId}.md`);
  if (!fileExists(htmlPath) && !fileExists(mdPath)) return null;
  const html = read(htmlPath);
  const parsed = html ? parseFragment(html) : null;
  return {
    id: fixId,
    format: html ? ("html" as const) : ("md" as const),
    fragment: parsed?.body ?? null,
    lints: parsed?.lints ?? [],
    markdown: html ? null : read(mdPath),
  };
}

export function projectInfo(relicDir: string) {
  const projectDir = join(relicDir, "..");
  const name = projectDir.split(/[\\/]/).filter(Boolean).pop() ?? "project";
  const mode = readMode(relicDir);
  const specsDir = join(relicDir, "specs");

  const specs = availableSpecs(specsDir).sort().map((id) => {
    const specMd = read(join(specsDir, id, "spec.md"));
    const header = parseSpecHeader(specMd, id);
    const tasks = parseTaskPhases(read(join(specsDir, id, "tasks.md")));
    return {
      id,
      title: header.title,
      status: header.status,
      tasks: { done: tasks.done, total: tasks.total },
      has_html: fileExists(join(specsDir, id, `${id}.html`)),
    };
  });

  const fixes: Array<{ id: string; format: "html" | "md" }> = [];
  const fixesDir = join(relicDir, "fixes");
  if (dirExists(fixesDir)) {
    for (const entry of readdirSync(fixesDir).sort()) {
      if (entry.endsWith(".html")) fixes.push({ id: entry.slice(0, -5), format: "html" });
      else if (entry.endsWith(".md") && entry !== "manifest.toon") fixes.push({ id: entry.slice(0, -3), format: "md" });
    }
  }

  // light validate summary (full detail via `relic validate`)
  let errors = 0;
  let warnings = 0;
  try {
    const registry = loadRegistry(relicDir);
    const owners = new Map<string, number>();
    for (const spec of registry) {
      for (const a of spec.artifacts.owns) {
        owners.set(a, (owners.get(a) ?? 0) + 1);
        if (!fileExists(join(relicDir, a))) errors++;
      }
      for (const a of spec.artifacts.reads) if (!fileExists(join(relicDir, a))) errors++;
      if (mode === "html") {
        const htmlPath = join(spec.path, `${spec.id}.html`);
        if (fileExists(htmlPath)) {
          for (const lint of parseFragment(readText(htmlPath)).lints) {
            if (lint.level === "error") errors++;
            else warnings++;
          }
        }
      }
    }
    for (const count of owners.values()) if (count > 1) errors++;
  } catch {
    // registry unreadable — leave counts at zero
  }

  return {
    project: { name, path: projectDir },
    mode,
    specs,
    fixes,
    validate: { valid: errors === 0, errors, warnings },
  };
}
