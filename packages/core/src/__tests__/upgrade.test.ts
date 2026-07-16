import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { runUpgrade } from "../commands/upgrade.ts";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Injected via the _runAddEngine test seam — never mock.module("@relic/engines"):
// bun module mocks are process-global and would leak into the engines package's
// own test files when suites share a process.
const runAddEngineMock = mock(async () => {});

let dir: string;
let relicDir: string;
let output: string[];
let consoleLogSpy: ReturnType<typeof spyOn>;
let consoleErrorSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "relic-upgrade-test-"));
  relicDir = join(dir, ".relic");
  mkdirSync(relicDir, { recursive: true });
  output = [];
  runAddEngineMock.mockClear();
  consoleLogSpy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    output.push(args.map(String).join(" "));
  });
  consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe("FR-4: dev channel", () => {
  test("outputs warning when channel is dev (default in test env)", async () => {
    await runUpgrade({check: false,
      promptsOnly: false,
      text: false,
      currentVersion: "0.5.1",
      relicDir, _runAddEngine: runAddEngineMock });
    const joined = output.join("\n");
    expect(joined).toContain("INSTALL_CHANNEL");
  });

  test("does not call fetch when channel is dev", async () => {
    const fetchSpy = spyOn(globalThis, "fetch");
    await runUpgrade({check: false,
      promptsOnly: false,
      text: false,
      currentVersion: "0.5.1",
      relicDir, _runAddEngine: runAddEngineMock });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("FR-14: missing config.json engines", () => {
  test("--prompts emits warning when config.json has no engines", async () => {
    await runUpgrade({check: false,
      promptsOnly: true,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    const result = JSON.parse(output[0]!);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("config.json");
  });

  test("--prompts does not throw when config.json has no engines", async () => {
    await expect(
      runUpgrade({check: false,
        promptsOnly: true,
        text: false,
        currentVersion: "0.5.1",
        relicDir,
        _channel: "npm", _runAddEngine: runAddEngineMock })
    ).resolves.toBeUndefined();
  });

  test("--prompts does not call runAddEngine when config.json has no engines", async () => {
    await runUpgrade({check: false,
      promptsOnly: true,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    expect(runAddEngineMock).not.toHaveBeenCalled();
  });
});

describe("--check", () => {
  test("returns correct UpgradeCheckResult shape for npm channel", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "0.6.0" }), { status: 200 })
    );
    await runUpgrade({check: true,
      promptsOnly: false,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    fetchSpy.mockRestore();
    const result = JSON.parse(output[0]!);
    expect(result.current).toBe("0.5.1");
    expect(result.latest).toBe("0.6.0");
    expect(result.update_available).toBe(true);
    expect(result.channel).toBe("npm");
  });

  test("returns correct UpgradeCheckResult shape for pypi channel", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ info: { version: "0.6.0" } }), { status: 200 })
    );
    await runUpgrade({check: true,
      promptsOnly: false,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "pypi", _runAddEngine: runAddEngineMock });
    fetchSpy.mockRestore();
    const result = JSON.parse(output[0]!);
    expect(result.current).toBe("0.5.1");
    expect(result.latest).toBe("0.6.0");
    expect(result.update_available).toBe(true);
    expect(result.channel).toBe("pypi");
  });

  test("update_available is false when already at latest", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "0.5.1" }), { status: 200 })
    );
    await runUpgrade({check: true,
      promptsOnly: false,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    fetchSpy.mockRestore();
    const result = JSON.parse(output[0]!);
    expect(result.update_available).toBe(false);
    expect(result.latest).toBe("0.5.1");
  });

  test("update_available is false when installed version is ahead (pre-release)", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "0.5.1" }), { status: 200 })
    );
    await runUpgrade({check: true,
      promptsOnly: false,
      text: false,
      currentVersion: "0.6.0",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    fetchSpy.mockRestore();
    const result = JSON.parse(output[0]!);
    expect(result.update_available).toBe(false);
  });
});

describe("--prompts with populated config.json", () => {
  test("calls runAddEngine for each registered engine", async () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: ["claude", "copilot"], mode: "md" }));
    await runUpgrade({check: false,
      promptsOnly: true,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    expect(runAddEngineMock).toHaveBeenCalledTimes(2);
    expect(runAddEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({ engine: "claude" })
    );
    expect(runAddEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({ engine: "copilot" })
    );
  });

  test("hooks_refreshed lists all registered engines", async () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: ["claude", "copilot"], mode: "md" }));
    await runUpgrade({check: false,
      promptsOnly: true,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    const result = JSON.parse(output[0]!);
    expect(result.hooks_refreshed).toEqual(["claude", "copilot"]);
    expect(result.warnings).toEqual([]);
  });

  test("unknown engine in config.json emits warning and skips runAddEngine", async () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: ["claude", "unknown-bot"], mode: "md" }));
    await runUpgrade({check: false,
      promptsOnly: true,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    const result = JSON.parse(output[0]!);
    expect(result.hooks_refreshed).toEqual(["claude"]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("unknown-bot");
    expect(runAddEngineMock).toHaveBeenCalledTimes(1);
  });

  test("--prompts with empty config.json engines: warnings contain config.json message, hooks_refreshed is empty", async () => {
    await runUpgrade({check: false,
      promptsOnly: true,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    const result = JSON.parse(output[0]!);
    expect(result.hooks_refreshed).toEqual([]);
    expect(result.warnings.some((w: string) => w.includes("config.json"))).toBe(true);
  });
});

describe("already up to date — consistent UpgradeResult shape", () => {
  test("returns full UpgradeResult shape (not ad-hoc) when already at latest", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "0.5.1" }), { status: 200 })
    );
    await runUpgrade({check: false,
      promptsOnly: false,
      text: false,
      currentVersion: "0.5.1",
      relicDir,
      _channel: "npm", _runAddEngine: runAddEngineMock });
    fetchSpy.mockRestore();
    const result = JSON.parse(output[0]!);
    expect(result).toHaveProperty("check");
    expect(result).toHaveProperty("binary_upgraded", false);
    expect(result).toHaveProperty("hooks_refreshed");
    expect(result).toHaveProperty("preamble_updated");
    expect(result).toHaveProperty("warnings");
  });
});

describe("upgrade --clean (spec 011)", () => {
  const { mkdtempSync: mkTmp, mkdirSync: mkDir, writeFileSync: writeF, readdirSync: readDir, rmSync: rmR, existsSync: exS } = require("fs");
  const { join: j } = require("path");
  const { tmpdir: tmpD } = require("os");

  test("removes only relic-managed command copies, reports them", async () => {
    const projectDir = mkTmp(j(tmpD(), "relic-upgrade-clean-"));
    try {
      const relicDir = j(projectDir, ".relic");
      mkDir(relicDir, { recursive: true });
      writeF(j(relicDir, "config.json"), JSON.stringify({ engines: ["claude"], mode: "md" }));
      const cmds = j(projectDir, ".claude", "commands");
      mkDir(cmds, { recursive: true });
      writeF(j(cmds, "relic.specify.md"), "old copy");
      writeF(j(cmds, "relic.fix.md"), "old copy");
      writeF(j(cmds, "my-own-command.md"), "user file");
      writeF(j(cmds, "relic-unrelated.md"), "user file — dash, not dot");

      const logs: string[] = [];
      const orig = console.log;
      console.log = (m: string) => logs.push(String(m));
      try {
        await runUpgrade({check: false, promptsOnly: true, clean: true, text: false, currentVersion: "0.0.1", relicDir, _channel: "npm", _runAddEngine: runAddEngineMock });
      } finally {
        console.log = orig;
      }
      const result = JSON.parse(logs.join(""));
      expect(result.cleaned.sort()).toEqual([".claude/commands/relic.fix.md", ".claude/commands/relic.specify.md"]);
      expect(readDir(cmds).sort()).toEqual(["my-own-command.md", "relic-unrelated.md"]);
    } finally {
      rmR(projectDir, { recursive: true, force: true });
    }
  });

  test("without --clean, copies are left untouched", async () => {
    const projectDir = mkTmp(j(tmpD(), "relic-upgrade-noclean-"));
    try {
      const relicDir = j(projectDir, ".relic");
      mkDir(relicDir, { recursive: true });
      writeF(j(relicDir, "config.json"), JSON.stringify({ engines: ["claude"], mode: "md" }));
      const cmds = j(projectDir, ".claude", "commands");
      mkDir(cmds, { recursive: true });
      writeF(j(cmds, "relic.specify.md"), "old copy");

      const logs: string[] = [];
      const orig = console.log;
      console.log = (m: string) => logs.push(String(m));
      try {
        await runUpgrade({check: false, promptsOnly: true, text: false, currentVersion: "0.0.1", relicDir, _channel: "npm", _runAddEngine: runAddEngineMock });
      } finally {
        console.log = orig;
      }
      const result = JSON.parse(logs.join(""));
      expect(result.cleaned).toEqual([]);
      expect(exS(j(cmds, "relic.specify.md"))).toBe(true);
    } finally {
      rmR(projectDir, { recursive: true, force: true });
    }
  });
});
