#!/usr/bin/env bun
/**
 * Generates plugin/commands/*.md from templates/prompts/*.md.
 *
 * templates/prompts/ stays the single source of truth (shared with the
 * Copilot/Codex engines); this script adds Claude Code command frontmatter
 * and writes the result into the plugin tree. Generated files are committed
 * so the repo is installable as a marketplace without a build step.
 *
 *   bun run scripts/build-plugin.ts          # generate
 *   bun run scripts/build-plugin.ts --check  # assert freshness + skill consistency (CI)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";

const ROOT = join(import.meta.dir, "..");
const PROMPTS_DIR = join(ROOT, "templates", "prompts");
const COMMANDS_DIR = join(ROOT, "plugin", "commands");
const SKILLS_DIR = join(ROOT, "plugin", "skills");
const CHECK = process.argv.includes("--check");

/** Authored (not generated) command files — never written by this script. */
const AUTHORED_COMMANDS = new Set(["setup.md"]);

/** One-line description per command — becomes the frontmatter `description`. */
const DESCRIPTIONS: Record<string, string> = {
  specify: "Create a new Relic spec from a feature description, PRD, or user story",
  clarify: "Append details, change contracts, or add behaviours to an existing Relic spec",
  plan: "Create the implementation plan for the active Relic spec (intersection discovery point)",
  analyse: "Non-destructive consistency check of the active Relic spec and shared artifacts",
  tasks: "Generate the atomic task list from the active Relic spec's plan",
  implement: "Implement the active Relic spec's tasks in order",
  fix: "Diagnose a bug through the owning Relic spec: classification + fix document",
  solve: "Apply the active Relic fix document's proposed changes and close the fix",
  use: "Switch the active Relic spec or fix for this session",
  scan: "Bootstrap the Relic knowledge layer from an existing codebase (run once on adoption)",
  constitution: "Extract project coding principles and standards into the Relic constitution",
  ask: "Query the Relic knowledge layer (read-only — answers only, no mutations)",
};

function generateCommand(name: string, body: string): string {
  const description = DESCRIPTIONS[name];
  if (!description) {
    console.error(`build-plugin: no description registered for command "${name}" — add it to DESCRIPTIONS`);
    process.exit(1);
  }
  if (body.trimStart().startsWith("---")) {
    console.error(`build-plugin: prompt "${name}" starts with '---', which would corrupt the generated frontmatter`);
    process.exit(1);
  }
  return `---
description: ${JSON.stringify(description)}
allowed-tools: "Bash(relic *)"
---

<!-- GENERATED from templates/prompts/${name}.md by scripts/build-plugin.ts — do not edit. -->

${body}`;
}

let stale: string[] = [];

function emit(path: string, content: string): void {
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === content) return;
  if (CHECK) {
    stale.push(path);
    return;
  }
  writeFileSync(path, content);
  console.log(`  wrote ${path.replace(ROOT + "/", "")}`);
}

mkdirSync(COMMANDS_DIR, { recursive: true });

const prompts = readdirSync(PROMPTS_DIR).filter((f) => f.endsWith(".md"));
for (const file of prompts) {
  const name = basename(file, ".md");
  const body = readFileSync(join(PROMPTS_DIR, file), "utf8");
  emit(join(COMMANDS_DIR, `${name}.md`), generateCommand(name, body));
}

// Guard: generated dir must not contain strays (other than authored files)
for (const file of readdirSync(COMMANDS_DIR)) {
  if (AUTHORED_COMMANDS.has(file)) continue;
  const name = basename(file, ".md");
  if (!prompts.includes(`${name}.md`)) {
    console.error(`build-plugin: plugin/commands/${file} has no source prompt — remove it or register as authored`);
    process.exit(1);
  }
}

/* ── Skill consistency: shared blocks must be identical across all skills ── */

const SHARED_BLOCK_MARKERS: Array<[string, string]> = [
  ["<!-- relic:shared:guards:start -->", "<!-- relic:shared:guards:end -->"],
  ["<!-- relic:shared:ladder:start -->", "<!-- relic:shared:ladder:end -->"],
];

function extractBlock(content: string, start: string, end: string, file: string): string {
  const i = content.indexOf(start);
  const j = content.indexOf(end);
  if (i < 0 || j < 0 || j < i) {
    console.error(`build-plugin: ${file} is missing the shared block ${start}`);
    process.exit(1);
  }
  return content.slice(i, j + end.length);
}

if (existsSync(SKILLS_DIR)) {
  const skillDirs = readdirSync(SKILLS_DIR).filter((d) =>
    existsSync(join(SKILLS_DIR, d, "SKILL.md"))
  );
  for (const [start, end] of SHARED_BLOCK_MARKERS) {
    let reference: { file: string; block: string } | null = null;
    for (const dir of skillDirs) {
      const file = `plugin/skills/${dir}/SKILL.md`;
      const content = readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf8");
      const block = extractBlock(content, start, end, file);
      if (!reference) {
        reference = { file, block };
      } else if (block !== reference.block) {
        console.error(
          `build-plugin: shared block ${start} differs between ${reference.file} and ${file} — keep it identical`
        );
        process.exit(1);
      }
    }
  }
  console.log(`Skill consistency: ${skillDirs.length} skills, shared blocks identical`);
}

if (CHECK && stale.length > 0) {
  console.error("build-plugin --check: generated files are stale — run: bun run scripts/build-plugin.ts");
  for (const p of stale) console.error(`  ${p.replace(ROOT + "/", "")}`);
  process.exit(1);
}

console.log(`Plugin commands: ${prompts.length} generated from templates/prompts/${CHECK ? " (check ok)" : ""}`);
