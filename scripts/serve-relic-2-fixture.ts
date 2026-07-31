#!/usr/bin/env bun

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runServe } from "../packages/cli-node/src/commands/serve.ts";

await runServe({
  projectDir: process.env.RELIC_FIXTURE_ROOT ?? join(
    dirname(fileURLToPath(import.meta.url)),
    "../packages/core/src/__fixtures__/relic-2-project",
  ),
  port: process.env.RELIC_VIEWER_PORT
    ? Number.parseInt(process.env.RELIC_VIEWER_PORT, 10)
    : undefined,
  version: "relic-2-fixture",
});
