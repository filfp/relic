import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runInit } from "../commands/init.ts";
import { loadKnowledgeProject } from "../knowledge/index.ts";

let dir: string;
let originalLog: typeof console.log;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "relic-init-"));
  originalLog = console.log;
  console.log = () => {};
});

afterEach(() => {
  console.log = originalLog;
  rmSync(dir, { recursive: true, force: true });
});

describe("Relic 2.0 init", () => {
  test("creates only RELIC.md and the two default corpus roots", async () => {
    const result = await runInit({ dir });
    expect(result.created).toEqual([
      ".relic/RELIC.md",
      ".relic/specs/",
      ".relic/shared/",
    ]);
    expect(readdirSync(join(dir, ".relic")).sort()).toEqual([
      "RELIC.md",
      "shared",
      "specs",
    ]);
    expect(readdirSync(dir).sort()).toEqual([".relic"]);
  });

  test("writes the accepted default topology and authoring rule", async () => {
    await runInit({ dir });
    const project = loadKnowledgeProject(dir);
    expect(project.topology).toEqual({
      specs: ".relic/specs",
      shared: ".relic/shared",
      records: {
        fr: "docs/requirements/functional",
        nfr: "docs/requirements/non-functional",
        adr: "docs/decisions",
        epic: "docs/epics",
      },
    });
    expect(readFileSync(join(dir, ".relic", "RELIC.md"), "utf8")).toContain(
      "inspect current canonical",
    );
  });

  test("leaves project-owned AGENTS.md byte-for-byte unchanged", async () => {
    const agents = Buffer.from("# Project agents\n\nOwned by this project.\n");
    writeFileSync(join(dir, "AGENTS.md"), agents);
    await runInit({ dir });
    expect(readFileSync(join(dir, "AGENTS.md"))).toEqual(agents);
  });

  test("creates no configuration, governance, session, or manifest files", async () => {
    await runInit({ dir });
    for (const path of [
      ".relic/config.json",
      ".relic/config.yaml",
      ".relic/preamble.md",
      ".relic/constitution.md",
      ".relic/session.json",
      ".relic/specs/manifest.toon",
      "PROJECT.md",
      "PRINCIPLES.md",
      "TEMPLATE.md",
    ]) {
      expect(existsSync(join(dir, path))).toBe(false);
    }
  });

  test("accepts an existing empty .relic directory", async () => {
    mkdirSync(join(dir, ".relic"));
    await runInit({ dir });
    expect(existsSync(join(dir, ".relic", "RELIC.md"))).toBe(true);
  });

  test("refuses to merge with or overwrite existing Relic files", async () => {
    mkdirSync(join(dir, ".relic"));
    const original = "legacy evidence\n";
    writeFileSync(join(dir, ".relic", "legacy.md"), original);

    await expect(runInit({ dir })).rejects.toThrow(/will not merge or overwrite/);
    expect(readFileSync(join(dir, ".relic", "legacy.md"), "utf8")).toBe(original);
    expect(existsSync(join(dir, ".relic", "RELIC.md"))).toBe(false);
    expect(existsSync(join(dir, ".relic", "specs"))).toBe(false);
  });

  test("refuses a missing project directory instead of creating it", async () => {
    const missing = join(dir, "missing");
    await expect(runInit({ dir: missing })).rejects.toThrow(
      /Project directory does not exist/,
    );
    expect(existsSync(missing)).toBe(false);
  });
});
