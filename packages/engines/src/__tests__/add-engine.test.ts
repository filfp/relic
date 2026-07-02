import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runAddEngine } from "../index.ts";
import { ENGINE_TEMPLATES } from "../generated/engine-templates.ts";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "relic-engines-test-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("ENGINE_TEMPLATES", () => {
  test("has entries for all 12 prompts/*.md keys", () => {
    const promptKeys = Object.keys(ENGINE_TEMPLATES).filter((k) =>
      k.startsWith("prompts/")
    );
    expect(promptKeys.length).toBe(12);
  });
});

describe("Claude engine (plugin era — spec 011)", () => {
  test("writes NO command files — the plugin carries the commands", async () => {
    await runAddEngine({ engine: "claude", projectDir: dir });
    expect(existsSync(join(dir, ".claude", "commands"))).toBe(false);
  });

  test("writes .claude/settings.json with Bash(relic *) allow rule", async () => {
    await runAddEngine({ engine: "claude", projectDir: dir });
    const settingsPath = join(dir, ".claude", "settings.json");
    expect(existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    expect(settings.permissions.allow).toContain("Bash(relic *)");
  });

  test("writes the relic marketplace + plugin enablement (per-project install)", async () => {
    await runAddEngine({ engine: "claude", projectDir: dir });
    const settings = JSON.parse(
      readFileSync(join(dir, ".claude", "settings.json"), "utf8")
    );
    expect(settings.extraKnownMarketplaces.relic).toEqual({
      source: { source: "github", repo: "filfp/relic" },
    });
    expect(settings.enabledPlugins["relic@relic"]).toBe(true);
  });

  test("preserves unrelated existing settings and stays idempotent", async () => {
    const { mkdirSync, writeFileSync } = await import("fs");
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      join(dir, ".claude", "settings.json"),
      JSON.stringify({ model: "opus", permissions: { allow: ["Bash(git *)"] } })
    );
    await runAddEngine({ engine: "claude", projectDir: dir });
    await runAddEngine({ engine: "claude", projectDir: dir });
    const settings = JSON.parse(
      readFileSync(join(dir, ".claude", "settings.json"), "utf8")
    );
    expect(settings.model).toBe("opus");
    expect(settings.permissions.allow).toEqual(["Bash(git *)", "Bash(relic *)"]);
    expect(Object.keys(settings.enabledPlugins)).toEqual(["relic@relic"]);
  });
});

describe("Copilot engine", () => {
  test("writes one .github/prompts/relic.*.prompt.md per prompt", async () => {
    await runAddEngine({ engine: "copilot", projectDir: dir });
    const promptsDir = join(dir, ".github", "prompts");
    expect(existsSync(promptsDir)).toBe(true);
    const files = (await import("fs")).readdirSync(promptsDir);
    expect(files.length).toBe(12);
    expect(files.every((f: string) => f.startsWith("relic.") && f.endsWith(".prompt.md"))).toBe(true);
  });

  test("each file contains YAML frontmatter and prompt body", async () => {
    await runAddEngine({ engine: "copilot", projectDir: dir });
    const content = readFileSync(
      join(dir, ".github", "prompts", "relic.specify.prompt.md"),
      "utf8"
    );
    expect(content).toMatch(/^---\ndescription: Relic specify command\n---/);
  });

  test("does NOT write .github/copilot-instructions.md", async () => {
    await runAddEngine({ engine: "copilot", projectDir: dir });
    expect(existsSync(join(dir, ".github", "copilot-instructions.md"))).toBe(false);
  });
});

describe("Codex engine", () => {
  test("writes one .codex/commands/relic.*.md per prompt", async () => {
    await runAddEngine({ engine: "codex", projectDir: dir });
    const commandsDir = join(dir, ".codex", "commands");
    expect(existsSync(commandsDir)).toBe(true);
    const files = (await import("fs")).readdirSync(commandsDir);
    expect(files.length).toBe(12);
    expect(files.every((f: string) => f.startsWith("relic.") && f.endsWith(".md"))).toBe(true);
  });

  test("does NOT write .codex/instructions.md", async () => {
    await runAddEngine({ engine: "codex", projectDir: dir });
    expect(existsSync(join(dir, ".codex", "instructions.md"))).toBe(false);
  });

  test("writes .codex/config.toml with [\"relic\"] pattern", async () => {
    await runAddEngine({ engine: "codex", projectDir: dir });
    const configPath = join(dir, ".codex", "config.toml");
    expect(existsSync(configPath)).toBe(true);
    expect(readFileSync(configPath, "utf8")).toContain('["relic"]');
  });

  test("idempotency: calling twice keeps exactly one [\"relic\"] occurrence", async () => {
    await runAddEngine({ engine: "codex", projectDir: dir });
    await runAddEngine({ engine: "codex", projectDir: dir });
    const content = readFileSync(
      join(dir, ".codex", "config.toml"),
      "utf8"
    );
    const occurrences = content.split('["relic"]').length - 1;
    expect(occurrences).toBe(1);
  });
});
