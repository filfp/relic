#!/usr/bin/env bun
import { Command } from "commander";
import { join } from "path";
import {
  runInit,
  runAddEngine,
  runUse,
  runScan,
  runSpecify,
  runFix,
  runClarify,
  runPlan,
  runAnalyse,
  runTasks,
  runImplement,
  runContext,
  runScaffold,
  runValidate,
  runSearch,
  runToonMigrate,
  runUpgrade,
  runWrite,
  runAsk,
  runMode,
  runSnippet,
  runHtmlSync,
  runExternal,
  runServe,
  runMcp,
  runViewerMigrate,
  findRelicDir,
  SUPPORTED_ENGINES,
  type Engine,
} from "@relic/core";
import { readEngines, writeEngines } from "@relic/utility";

const VERSION = "0.9.0";
const program = new Command();

program
  .name("relic")
  .description("Spec-driven development with a shared artifact layer")
  .version(VERSION);

program
  .command("init")
  .description("Initialise Relic in the current project")
  .option("--dir <path>", "Project root directory", process.cwd())
  .option("--force", "Reinitialise even if .relic/ already exists", false)
  .option(
    "--engine <engines>",
    `AI engines to configure, comma-separated (${SUPPORTED_ENGINES.join("|")})`,
    "claude"
  )
  .option("--external-fr <path>", "External Functional Requirements directory")
  .option("--external-nfr <path>", "External Non-Functional Requirements directory")
  .option("--external-br <path>", "External Business Requirements directory")
  .option("--external-adr <path>", "External Architecture Decision Records directory")
  .option("--external-us <path>", "External User Stories directory")
  .option("--external-epic <path>", "External Epics directory")
  .action(async (opts: { dir: string; force: boolean; engine: string; externalFr?: string; externalNfr?: string; externalBr?: string; externalAdr?: string; externalUs?: string; externalEpic?: string }) => {
    const engines = opts.engine
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean) as Engine[];
    const external = {
      fr: opts.externalFr, nfr: opts.externalNfr, br: opts.externalBr,
      adr: opts.externalAdr, us: opts.externalUs, epic: opts.externalEpic,
    };
    const hasExternal = Object.values(external).some(Boolean);
    await runInit({ dir: opts.dir, force: opts.force, engines, ...(hasExternal ? { external } : {}) });
  });

program
  .command("add-engine <engine>")
  .description(`Add AI engine hooks to an existing Relic project (${SUPPORTED_ENGINES.join("|")})`)
  .action(async (engine: string) => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    const projectDir = join(relicDir, "..");
    await runAddEngine({ engine: engine as Engine, projectDir });
    const engines = readEngines(relicDir);
    writeEngines(relicDir, [...engines, engine]);
  });

program
  .command("specify")
  .description("Create a new spec")
  .option("--title <title>", "Spec title")
  .action(async (opts: { title?: string }) => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runSpecify({ title: opts.title, relicDir });
  });

program
  .command("fix")
  .description("Fix a bug using the spec as context")
  .option("--spec <id>", "Spec ID (overrides branch inference and RELIC_SPEC env)")
  .option("--issue <description>", "Issue description to append to the assembled context")
  .action(async (opts: { spec?: string; issue?: string }) => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runFix({ spec: opts.spec, issue: opts.issue, relicDir });
  });

program
  .command("clarify")
  .description("Append details or change contracts for a spec (check intersections)")
  .option("--spec <id>", "Spec ID")
  .action(async () => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runClarify({ relicDir });
  });

program
  .command("plan")
  .description("Create an implementation plan")
  .option("--spec <id>", "Spec ID")
  .action(async () => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runPlan({ relicDir });
  });

program
  .command("analyse")
  .description("Non-destructive consistency check")
  .option("--spec <id>", "Spec ID")
  .action(async () => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runAnalyse({ relicDir });
  });

program
  .command("tasks")
  .description("Generate tasks from the current plan")
  .option("--spec <id>", "Spec ID")
  .action(async () => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runTasks({ relicDir });
  });

program
  .command("ask")
  .description("Query the shared knowledge layer (read-only)")
  .action(async () => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runAsk({ relicDir });
  });

program
  .command("implement")
  .description("Build the plan")
  .option("--spec <id>", "Spec ID")
  .action(async () => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runImplement({ relicDir });
  });

program
  .command("use [spec-id]")
  .description("Set the active spec, fix, or clear the active fix")
  .option("--fix <fix-id>", "Set active fix")
  .option("--clear-fix", "Clear active fix", false)
  .action(async (specId: string | undefined, opts: { fix?: string; clearFix: boolean }) => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runUse({ specId, fix: opts.fix, clearFix: opts.clearFix, relicDir });
  });

program
  .command("scan")
  .description("Scan existing codebase and output a project manifest for AI artifact generation")
  .option("--json", "Output manifest as JSON (for AI consumption)", false)
  .action(async (opts: { json: boolean }) => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    const projectDir = join(relicDir, "..");
    await runScan({ projectDir, relicDir, json: opts.json });
  });

program
  .command("context")
  .description("Resolve active spec and report context (files, shared artifacts)")
  .option("--spec <id>", "Spec ID (overrides branch inference and RELIC_SPEC env)")
  .option("--text", "Human-readable output instead of JSON", false)
  .action(async (opts: { spec?: string; text: boolean }) => {
    await runContext({ spec: opts.spec, text: opts.text });
  });

program
  .command("scaffold")
  .description("Ensure a spec folder exists; create from templates if new")
  .option("--title <title>", "Title for a new spec")
  .option("--spec <id>", "Spec ID for an existing spec")
  .action(async (opts: { title?: string; spec?: string }) => {
    await runScaffold({ title: opts.title, spec: opts.spec });
  });

program
  .command("validate")
  .description("Check artifact integrity and ownership conflicts")
  .option("--text", "Human-readable output instead of JSON", false)
  .action(async (opts: { text: boolean }) => {
    await runValidate({ text: opts.text });
  });

program
  .command("search [keywords...]")
  .description("Search manifest indexes by keyword; use --deep for all entries")
  .option("--deep", "Return all entries without filtering", false)
  .option("--knowledge", "Scope to shared knowledge artifacts only", false)
  .option("--spec", "Scope to spec index only", false)
  .option("--fix", "Scope to fix index only", false)
  .option("--json", "Output as JSON array instead of toon lines", false)
  .action(async (keywords: string[], opts: { deep: boolean; knowledge: boolean; spec: boolean; fix: boolean; json: boolean }) => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    await runSearch({ keywords, deep: opts.deep, knowledge: opts.knowledge, spec: opts.spec, fix: opts.fix, json: opts.json, relicDir });
  });

program
  .command("write")
  .description("Write a structured entry to a toon index or changelog")
  .option("--changelog", "Target: .relic/changelog.md", false)
  .option("--specs", "Target: specs/manifest.toon", false)
  .option("--fixes", "Target: fixes/manifest.toon", false)
  .option("--knowledge-domains", "Target: shared/domains/manifest.toon", false)
  .option("--knowledge-contracts", "Target: shared/contracts/manifest.toon", false)
  .option("--knowledge-rules", "Target: shared/rules/manifest.toon", false)
  .option("--knowledge-assumptions", "Target: shared/assumptions/manifest.toon", false)
  .requiredOption("--payload <json>", "Compact JSON payload (WritePayload schema)")
  .action(async (opts: {
    changelog: boolean;
    specs: boolean;
    fixes: boolean;
    knowledgeDomains: boolean;
    knowledgeContracts: boolean;
    knowledgeRules: boolean;
    knowledgeAssumptions: boolean;
    payload: string;
  }) => {
    const targets = [
      opts.changelog && "changelog",
      opts.specs && "specs",
      opts.fixes && "fixes",
      opts.knowledgeDomains && "knowledge-domains",
      opts.knowledgeContracts && "knowledge-contracts",
      opts.knowledgeRules && "knowledge-rules",
      opts.knowledgeAssumptions && "knowledge-assumptions",
    ].filter(Boolean) as string[];
    if (targets.length !== 1) {
      console.error("Error: exactly one target flag must be provided (e.g. --changelog, --specs).");
      process.exit(1);
    }
    await runWrite({ target: targets[0] as import("@relic/core").WriteTarget, payload: opts.payload });
  });

program
  .command("toon-migrate")
  .description("Convert shared/*/manifest.json → manifest.toon; rebuild spec and fix indexes")
  .action(async () => {
    const relicDir = findRelicDir(process.cwd());
    if (!relicDir) {
      console.error("Not in a Relic project. Run: relic init");
      process.exit(1);
    }
    const result = await runToonMigrate({ relicDir });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("upgrade")
  .description("Upgrade relic-cli and refresh AI engine hook files")
  .option("--check", "Check for updates only, do not install", false)
  .option("--prompts", "Refresh engine hook files only, skip binary upgrade", false)
  .option("--clean", "Remove superseded relic-managed command copies (.claude/commands/relic.*.md)", false)
  .option("--text", "Human-readable output instead of JSON", false)
  .action(async (opts: { check: boolean; prompts: boolean; clean: boolean; text: boolean }) => {
    const relicDir = findRelicDir(process.cwd()) ?? undefined;
    await runUpgrade({
      check: opts.check,
      promptsOnly: opts.prompts,
      clean: opts.clean,
      text: opts.text,
      currentVersion: VERSION,
      relicDir,
    });
  });

program
  .command("mode [value]")
  .description("Get or set the project mode (md|html). In html mode, specs carry a <spec-id>.html fragment rendered by the embedded viewer (relic serve).")
  .option("--text", "Human-readable output instead of JSON", false)
  .action(async (value: string | undefined, opts: { text: boolean }) => {
    await runMode({ value, text: opts.text });
  });

program
  .command("snippet <name>")
  .description("Output named snippet content from baked SNIPPETS registry")
  .action((name: string) => {
    runSnippet(name);
  });

program
  .command("external [args...]")
  .description("External spec repo integration: report, set <type> <path>, link <type>/<file>, create <type> <title>, list, init <remote-url>")
  .option("--path <local-path>", "Submodule path for external init (default: specs/)")
  .option("--spec <id>", "Spec ID override for link/create/list")
  .option("--text", "Human-readable output instead of JSON", false)
  .action(async (args: string[], opts: { path?: string; spec?: string; text: boolean }) => {
    await runExternal({ args: args ?? [], path: opts.path, spec: opts.spec, text: opts.text });
  });

program
  .command("serve")
  .description("Start the spec viewer server (read-only, localhost; port from config.json viewer.port)")
  .option("--port <n>", "Port override")
  .option("--text", "Human-readable output instead of JSON", false)
  .action(async (opts: { port?: string; text: boolean }) => {
    await runServe({ port: opts.port ? parseInt(opts.port, 10) : undefined, text: opts.text, version: VERSION });
  });

program
  .command("mcp")
  .description("Run the Relic MCP server on stdio (tools: view_spec, view_fix, list_views)")
  .action(async () => {
    await runMcp({ version: VERSION });
  });

program
  .command("viewer-migrate")
  .description("Convert pre-012 full-document spec/fix HTML files into <relic-body> fragments")
  .option("--text", "Human-readable output instead of JSON", false)
  .action(async (opts: { text: boolean }) => {
    await runViewerMigrate({ text: opts.text });
  });

program
  .command("html-sync")
  .description("RETIRED — use relic viewer-migrate / relic serve")
  .option("--spec <id>", "Sync a single spec instead of all")
  .option("--text", "Human-readable output instead of JSON", false)
  .action(async (opts: { spec?: string; text: boolean }) => {
    await runHtmlSync({ spec: opts.spec, text: opts.text });
  });

program.parse(process.argv);
