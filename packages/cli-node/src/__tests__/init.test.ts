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

import { loadKnowledgeProject } from "@relic/core";

import { runInit } from "../commands/init.ts";

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
  test("creates only the root topology file", async () => {
    const result = await runInit({ dir });
    expect(result.created).toEqual(["relic.yaml"]);
    expect(readdirSync(dir)).toEqual(["relic.yaml"]);
    expect(existsSync(join(dir, ".relic"))).toBe(false);
  });

  test("writes topology-only YAML with conventional default paths", async () => {
    await runInit({ dir });
    const project = loadKnowledgeProject(dir);
    expect(project.topology).toEqual({
      specs: ".relic/specs",
      shared: ".relic/shared",
      records: {
        fr: ".relic/records/requirements/functional",
        nfr: ".relic/records/requirements/non-functional",
        adr: ".relic/records/decisions",
        br: ".relic/records/business-rules",
        gl: ".relic/records/glossary",
        epic: ".relic/records/epics",
      },
    });
    const source = readFileSync(join(dir, "relic.yaml"), "utf8");
    expect(source.startsWith("topology:\n")).toBe(true);
    expect(source).not.toContain("---");
    expect(source).not.toContain("# Relic");
    expect(project.documents).toEqual([]);
    expect(project.diagnostics).toEqual([]);
  });

  test("leaves project-owned AGENTS.md byte-for-byte unchanged", async () => {
    const agents = Buffer.from("# Project agents\n\nOwned by this project.\n");
    writeFileSync(join(dir, "AGENTS.md"), agents);
    await runInit({ dir });
    expect(readFileSync(join(dir, "AGENTS.md"))).toEqual(agents);
  });

  test("creates no corpus, governance, session, or manifest files", async () => {
    await runInit({ dir });
    for (const path of [
      ".relic",
      "config.json",
      "config.yaml",
      "preamble.md",
      "constitution.md",
      "session.json",
      "PROJECT.md",
      "PRINCIPLES.md",
      "TEMPLATE.md",
    ]) {
      expect(existsSync(join(dir, path))).toBe(false);
    }
  });

  test("leaves an existing legacy .relic tree untouched", async () => {
    mkdirSync(join(dir, ".relic"));
    writeFileSync(join(dir, ".relic", "legacy.md"), "legacy evidence\n");

    await runInit({ dir });

    expect(existsSync(join(dir, "relic.yaml"))).toBe(true);
    expect(readFileSync(join(dir, ".relic", "legacy.md"), "utf8"))
      .toBe("legacy evidence\n");
  });

  test("refuses to overwrite an existing relic.yaml", async () => {
    const original = "topology: project-owned\n";
    writeFileSync(join(dir, "relic.yaml"), original);

    await expect(runInit({ dir })).rejects.toThrow(/will not overwrite/);
    expect(readFileSync(join(dir, "relic.yaml"), "utf8")).toBe(original);
  });

  test("refuses a missing project directory instead of creating it", async () => {
    const missing = join(dir, "missing");
    await expect(runInit({ dir: missing })).rejects.toThrow(
      /Project directory does not exist/,
    );
    expect(existsSync(missing)).toBe(false);
  });
});
