#!/usr/bin/env bun
import { Command, InvalidArgumentError } from "commander";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { SUPPORTED_ENGINES } from "@relic/engines";

import { runInit } from "./commands/init.ts";
import { runInstall } from "./commands/install.ts";
import { runSearch } from "./commands/search.ts";
import { runServe } from "./commands/serve.ts";

const VERSION = "2.0.2";

function port(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new InvalidArgumentError("port must be an integer between 1 and 65535");
  }
  return parsed;
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name("relic")
    .description("Shared project knowledge for coding agents")
    .version(VERSION);

  program
    .command("init")
    .description("Create the minimal Relic project foundation")
    .option("--dir <path>", "Project root directory", process.cwd())
    .action(async (options: { dir: string }) => {
      await runInit({ dir: options.dir });
    });

  program
    .command("install")
    .description("Install or refresh the project-local Relic skill")
    .option(
      "--engine <engine>",
      `Install only one engine (${SUPPORTED_ENGINES.join("|")})`,
    )
    .action(async (options: { engine?: string }) => {
      await runInstall({ engine: options.engine });
    });

  program
    .command("search")
    .description("Search the complete current Relic corpus")
    .argument("<query...>", "Search query")
    .option("--json", "Output the result model as JSON", false)
    .action(async (query: string[], options: { json: boolean }) => {
      await runSearch({ query: query.join(" "), json: options.json });
    });

  program
    .command("serve")
    .description("Serve the read-only Relic knowledge viewer")
    .option("--port <port>", "Bind a specific localhost port", port)
    .action(async (options: { port?: number }) => {
      await runServe({ port: options.port, version: VERSION });
    });

  return program;
}

export async function main(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

const invokedPath = process.argv[1];
let isPathMain = false;
if (invokedPath !== undefined) {
  try {
    isPathMain = realpathSync(fileURLToPath(import.meta.url)) ===
      realpathSync(invokedPath);
  } catch {
    isPathMain = false;
  }
}

if (import.meta.main || isPathMain) {
  try {
    await main();
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
