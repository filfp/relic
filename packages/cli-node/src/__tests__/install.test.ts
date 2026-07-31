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
import { runInstall } from "../commands/install.ts";

let dir: string;
let originalLog: typeof console.log;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "relic-install-"));
  originalLog = console.log;
  console.log = () => {};
  await runInit({ dir });
});

afterEach(() => {
  console.log = originalLog;
  rmSync(dir, { recursive: true, force: true });
});

describe("Relic install command", () => {
  test("explicit engine creates only the selected project-local skill", async () => {
    const agents = "# Project-owned instructions\n";
    writeFileSync(join(dir, "AGENTS.md"), agents);

    const result = await runInstall({ engine: "codex", projectDir: dir });
    expect(result.installed.map((item) => item.engine)).toEqual(["codex"]);
    expect(existsSync(join(dir, ".codex", "skills", "relic", "SKILL.md")))
      .toBe(true);
    expect(existsSync(join(dir, ".claude"))).toBe(false);
    expect(existsSync(join(dir, ".github"))).toBe(false);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toBe(agents);
    expect(existsSync(join(dir, ".relic", "config.yaml"))).toBe(false);
    expect(existsSync(join(dir, ".relic", "config.json"))).toBe(false);
  });

  test("no argument refreshes every detected native engine root", async () => {
    mkdirSync(join(dir, ".claude"));
    mkdirSync(join(dir, ".codex"));
    const result = await runInstall({ projectDir: dir });
    expect(result.installed.map((item) => item.engine)).toEqual([
      "claude",
      "codex",
    ]);
    expect(existsSync(join(dir, ".claude", "skills", "relic", "SKILL.md")))
      .toBe(true);
    expect(existsSync(join(dir, ".codex", "skills", "relic", "SKILL.md")))
      .toBe(true);
  });

  test("fails actionably when no engine root exists and leaves no state", async () => {
    const before = readdirSync(dir).sort();
    await expect(runInstall({ projectDir: dir })).rejects.toThrow(
      /Pass --engine/,
    );
    expect(readdirSync(dir).sort()).toEqual(before);
  });

  test("rejects an unknown engine before creating engine state", async () => {
    await expect(
      runInstall({ engine: "unknown", projectDir: dir }),
    ).rejects.toThrow(/Unknown engine/);
    expect(existsSync(join(dir, ".codex"))).toBe(false);
    expect(existsSync(join(dir, ".claude"))).toBe(false);
    expect(existsSync(join(dir, ".github"))).toBe(false);
  });

  test("requires the 2.0 project entry instead of adopting a legacy tree", async () => {
    const legacy = mkdtempSync(join(tmpdir(), "relic-install-legacy-"));
    try {
      mkdirSync(join(legacy, ".relic"));
      await expect(
        runInstall({ engine: "codex", projectDir: legacy }),
      ).rejects.toThrow(/Missing \.relic\/RELIC\.md/);
      expect(existsSync(join(legacy, ".codex"))).toBe(false);
    } finally {
      rmSync(legacy, { recursive: true, force: true });
    }
  });
});
