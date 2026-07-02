import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  readProjectConfig,
  writeProjectConfig,
  readEngines,
  writeEngines,
  readMode,
  writeMode,
} from "../project-config.ts";

let relicDir: string;
beforeEach(() => {
  relicDir = mkdtempSync(join(tmpdir(), "relic-config-test-"));
});
afterEach(() => {
  rmSync(relicDir, { recursive: true, force: true });
});

describe("readProjectConfig — no files", () => {
  test("returns default config when neither config.json nor engines.json exist", () => {
    expect(readProjectConfig(relicDir)).toEqual({ engines: [], mode: "md" });
  });
});

describe("readProjectConfig — config.json present", () => {
  test("reads engines and mode from config.json", () => {
    writeFileSync(
      join(relicDir, "config.json"),
      JSON.stringify({ engines: ["claude", "copilot"], mode: "html" })
    );
    expect(readProjectConfig(relicDir)).toEqual({ engines: ["claude", "copilot"], mode: "html" });
  });

  test("defaults mode to md when mode field is absent", () => {
    writeFileSync(
      join(relicDir, "config.json"),
      JSON.stringify({ engines: ["claude"] })
    );
    expect(readProjectConfig(relicDir).mode).toBe("md");
  });

  test("defaults mode to md when mode value is unrecognised", () => {
    writeFileSync(
      join(relicDir, "config.json"),
      JSON.stringify({ engines: [], mode: "unknown" })
    );
    expect(readProjectConfig(relicDir).mode).toBe("md");
  });

  test("returns default when config.json is malformed JSON", () => {
    writeFileSync(join(relicDir, "config.json"), "not-json");
    expect(readProjectConfig(relicDir)).toEqual({ engines: [], mode: "md" });
  });

  test("returns default when config.json is a JSON array instead of object", () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify(["claude"]));
    expect(readProjectConfig(relicDir)).toEqual({ engines: [], mode: "md" });
  });
});

describe("readProjectConfig — engines.json migration", () => {
  test("migrates engines.json to config.json when only engines.json exists", () => {
    writeFileSync(join(relicDir, "engines.json"), JSON.stringify(["claude", "copilot"]));
    const config = readProjectConfig(relicDir);
    expect(config).toEqual({ engines: ["claude", "copilot"], mode: "md" });
  });

  test("writes config.json after migration", () => {
    writeFileSync(join(relicDir, "engines.json"), JSON.stringify(["claude"]));
    readProjectConfig(relicDir);
    expect(existsSync(join(relicDir, "config.json"))).toBe(true);
  });

  test("removes engines.json after migration", () => {
    writeFileSync(join(relicDir, "engines.json"), JSON.stringify(["claude"]));
    readProjectConfig(relicDir);
    expect(existsSync(join(relicDir, "engines.json"))).toBe(false);
  });

  test("migration is idempotent — second read from config.json returns same result", () => {
    writeFileSync(join(relicDir, "engines.json"), JSON.stringify(["claude"]));
    const first = readProjectConfig(relicDir);
    const second = readProjectConfig(relicDir);
    expect(first).toEqual(second);
    expect(second).toEqual({ engines: ["claude"], mode: "md" });
  });

  test("prefers config.json over engines.json when both exist", () => {
    writeFileSync(
      join(relicDir, "config.json"),
      JSON.stringify({ engines: ["copilot"], mode: "html" })
    );
    writeFileSync(join(relicDir, "engines.json"), JSON.stringify(["claude"]));
    const config = readProjectConfig(relicDir);
    expect(config).toEqual({ engines: ["copilot"], mode: "html" });
  });

  test("handles malformed engines.json gracefully — returns default", () => {
    writeFileSync(join(relicDir, "engines.json"), "not-json");
    expect(readProjectConfig(relicDir)).toEqual({ engines: [], mode: "md" });
  });
});

describe("writeProjectConfig", () => {
  test("round-trip: write then read returns same config", () => {
    const config = { engines: ["claude", "codex"], mode: "html" as const };
    writeProjectConfig(relicDir, config);
    expect(readProjectConfig(relicDir)).toEqual(config);
  });

  test("overwrites existing config.json", () => {
    writeProjectConfig(relicDir, { engines: ["claude"], mode: "md" });
    writeProjectConfig(relicDir, { engines: ["copilot"], mode: "html" });
    expect(readProjectConfig(relicDir)).toEqual({ engines: ["copilot"], mode: "html" });
  });
});

describe("readEngines / writeEngines", () => {
  test("readEngines returns [] when no config exists", () => {
    expect(readEngines(relicDir)).toEqual([]);
  });

  test("writeEngines deduplicates and sorts", () => {
    writeEngines(relicDir, ["copilot", "claude", "claude"]);
    expect(readEngines(relicDir)).toEqual(["claude", "copilot"]);
  });

  test("writeEngines preserves existing mode", () => {
    writeProjectConfig(relicDir, { engines: [], mode: "html" });
    writeEngines(relicDir, ["claude"]);
    expect(readMode(relicDir)).toBe("html");
  });
});

describe("readMode / writeMode", () => {
  test("readMode returns md by default", () => {
    expect(readMode(relicDir)).toBe("md");
  });

  test("writeMode persists mode", () => {
    writeMode(relicDir, "html");
    expect(readMode(relicDir)).toBe("html");
  });

  test("writeMode preserves existing engines", () => {
    writeEngines(relicDir, ["claude", "copilot"]);
    writeMode(relicDir, "html");
    expect(readEngines(relicDir)).toEqual(["claude", "copilot"]);
  });

  test("switching mode back to md from html persists", () => {
    writeMode(relicDir, "html");
    writeMode(relicDir, "md");
    expect(readMode(relicDir)).toBe("md");
  });
});

describe("external config (spec 009)", () => {
  const { mkdirSync, readFileSync } = require("fs");
  const { EXTERNAL_TYPES, readExternalTypes, writeExternalType, resolveExternalDir, parseExternalEntry, resolveExternalRead, ExternalConfigError } = require("../project-config.ts");

  // parent project dir with .relic inside — external paths resolve against the parent
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "relic-external-test-"));
    relicDir = join(dir, ".relic");
    mkdirSync(relicDir, { recursive: true });
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("external map round-trips through read/write and preserves other fields", () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: ["claude"], mode: "html" }));
    writeExternalType(relicDir, "fr", "./docs/fr");
    writeExternalType(relicDir, "adr", "/abs/decisions");
    const config = readProjectConfig(relicDir);
    expect(config.engines).toEqual(["claude"]);
    expect(config.mode).toBe("html");
    expect(config.external).toEqual({ fr: "./docs/fr", adr: "/abs/decisions" });
    // stored as given — not normalised to absolute
    const raw = JSON.parse(readFileSync(join(relicDir, "config.json"), "utf8"));
    expect(raw.external.fr).toBe("./docs/fr");
  });

  test("readExternalTypes returns empty map when unconfigured", () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "md" }));
    expect(readExternalTypes(relicDir)).toEqual({});
  });

  test("resolveExternalDir resolves relative paths against the .relic parent", () => {
    writeExternalType(relicDir, "fr", "./docs/fr");
    expect(resolveExternalDir(relicDir, "fr")).toBe(join(dir, "docs", "fr"));
    expect(resolveExternalDir(relicDir, "nfr")).toBeNull();
  });

  test("resolveExternalDir passes absolute paths through", () => {
    writeExternalType(relicDir, "adr", join(dir, "decisions"));
    expect(resolveExternalDir(relicDir, "adr")).toBe(join(dir, "decisions"));
  });

  test("parseExternalEntry splits type and filename, normalising separators", () => {
    expect(parseExternalEntry("fr/FR-001-auth.md")).toEqual({ entry: "fr/FR-001-auth.md", type: "fr", filename: "FR-001-auth.md" });
    expect(parseExternalEntry("adr\\ADR-002-db.md").filename).toBe("ADR-002-db.md");
  });

  test("parseExternalEntry rejects malformed and unknown-type entries", () => {
    expect(() => parseExternalEntry("no-slash")).toThrow(ExternalConfigError);
    expect(() => parseExternalEntry("wat/FILE.md")).toThrow(/unknown type/);
    expect(() => parseExternalEntry("fr/")).toThrow(ExternalConfigError);
  });

  test("resolveExternalRead reports existence", () => {
    mkdirSync(join(dir, "docs", "fr"), { recursive: true });
    writeFileSync(join(dir, "docs", "fr", "FR-001-auth.md"), "# FR-001");
    writeExternalType(relicDir, "fr", "./docs/fr");
    const hit = resolveExternalRead(relicDir, "fr/FR-001-auth.md");
    expect(hit.exists).toBe(true);
    expect(hit.resolved_path).toBe(join(dir, "docs", "fr", "FR-001-auth.md"));
    expect(resolveExternalRead(relicDir, "fr/FR-404-nope.md").exists).toBe(false);
  });

  test("resolveExternalRead hard-errors on unconfigured type and traversal", () => {
    writeExternalType(relicDir, "fr", "./docs/fr");
    expect(() => resolveExternalRead(relicDir, "adr/ADR-001.md")).toThrow(/not configured/);
    expect(() => resolveExternalRead(relicDir, "fr/../secrets.md")).toThrow(/traversal/);
    expect(() => resolveExternalRead(relicDir, "fr/nested/../../secrets.md")).toThrow(/traversal/);
  });

  test("EXTERNAL_TYPES covers the six documented types", () => {
    expect([...EXTERNAL_TYPES]).toEqual(["fr", "nfr", "br", "adr", "us", "epic"]);
  });
});

describe("sdd knob (spec 011)", () => {
  const { readSdd } = require("../project-config.ts");

  test("defaults to auto when absent or invalid", () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "md" }));
    expect(readSdd(relicDir)).toBe("auto");
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "md", sdd: "yolo" }));
    expect(readSdd(relicDir)).toBe("auto");
  });

  test("reads suggest and survives round-trips", () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "html", sdd: "suggest" }));
    expect(readSdd(relicDir)).toBe("suggest");
    // round-trip through an unrelated write preserves sdd
    writeMode(relicDir, "md");
    expect(readSdd(relicDir)).toBe("suggest");
    expect(readProjectConfig(relicDir).mode).toBe("md");
  });
});
