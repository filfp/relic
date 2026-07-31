import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";
import { tmpdir } from "os";
import { runExternal } from "../commands/external.ts";

let dir: string;
let relicDir: string;

async function externalJson(args: string[], extra: Partial<Parameters<typeof runExternal>[0]> = {}): Promise<any> {
  const logs: string[] = [];
  const orig = console.log;
  console.log = (msg: string) => logs.push(String(msg));
  try {
    await runExternal({ args, relicDir, ...extra });
  } finally {
    console.log = orig;
  }
  return JSON.parse(logs.join(""));
}

function writeConfig(external: Record<string, string>): void {
  writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "md", external }));
}

function makeSpec(specId: string, artifacts: Record<string, unknown> = {}): void {
  const specDir = join(relicDir, "specs", specId);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    join(specDir, "artifacts.json"),
    JSON.stringify({ owns: [], reads: [], touches_files: [], ...artifacts })
  );
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "relic-external-cmd-"));
  relicDir = join(dir, ".relic");
  mkdirSync(join(relicDir, "specs"), { recursive: true });
  writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "md" }));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("relic external (report)", () => {
  test("reports configured:false when no types are set", async () => {
    expect(await externalJson([])).toEqual({ configured: false });
  });

  test("lists configured types with existence and one-level entries", async () => {
    mkdirSync(join(dir, "docs", "fr", "archive"), { recursive: true });
    writeFileSync(join(dir, "docs", "fr", "FR-001-auth.md"), "x");
    writeConfig({ fr: "./docs/fr", adr: "./docs/adr" });
    const result = await externalJson([]);
    expect(result.configured).toBe(true);
    expect(result.types.fr.exists).toBe(true);
    expect(result.types.fr.entries).toEqual([
      { name: "FR-001-auth.md", type: "file" },
      { name: "archive", type: "dir" },
    ]);
    expect(result.types.adr.exists).toBe(false);
    expect(result.types.adr.entries).toEqual([]);
    expect(result.types.nfr).toBeUndefined();
  });
});

describe("relic external set", () => {
  test("writes config.external and reports previous path", async () => {
    mkdirSync(join(dir, "docs", "fr"), { recursive: true });
    const first = await externalJson(["set", "fr", "./docs/fr"]);
    expect(first).toEqual({ success: true, type: "fr", previous_path: null, new_path: "./docs/fr", exists: true });
    const second = await externalJson(["set", "fr", "./elsewhere"]);
    expect(second.previous_path).toBe("./docs/fr");
    expect(second.exists).toBe(false);
    const raw = JSON.parse(readFileSync(join(relicDir, "config.json"), "utf8"));
    expect(raw.external.fr).toBe("./elsewhere");
  });
});

describe("relic external link", () => {
  test("links an existing document to the given spec, deduplicated", async () => {
    mkdirSync(join(dir, "docs", "fr"), { recursive: true });
    writeFileSync(join(dir, "docs", "fr", "FR-001-auth.md"), "x");
    writeConfig({ fr: "./docs/fr" });
    makeSpec("001-auth");

    const result = await externalJson(["link", "fr/FR-001-auth.md"], { spec: "001-auth" });
    expect(result.success).toBe(true);
    expect(result.linked_to_spec).toBe("001-auth");
    expect(result.exists).toBe(true);

    await externalJson(["link", "fr/FR-001-auth.md"], { spec: "001-auth" });
    const artifacts = JSON.parse(readFileSync(join(relicDir, "specs", "001-auth", "artifacts.json"), "utf8"));
    expect(artifacts.external_reads).toEqual(["fr/FR-001-auth.md"]);
    expect(artifacts.owns).toEqual([]); // existing fields preserved
  });
});

describe("relic external create", () => {
  test("creates from template with sequential id and links to the spec (non-git: warning)", async () => {
    mkdirSync(join(dir, "docs", "adr"), { recursive: true });
    writeFileSync(join(dir, "docs", "adr", "ADR-004-old-choice.md"), "x");
    writeConfig({ adr: "./docs/adr" });
    makeSpec("002-payments");

    const result = await externalJson(["create", "adr", "Database", "sharding", "strategy"], { spec: "002-payments" });
    expect(result.filename).toBe("ADR-005-database-sharding-strategy.md");
    expect(result.external_reads_entry).toBe("adr/ADR-005-database-sharding-strategy.md");
    expect(result.linked_to_spec).toBe("002-payments");
    expect(result.committed).toBe(false);
    expect(result.warning).toContain("not inside a git repository");

    const doc = readFileSync(result.resolved_path, "utf8");
    expect(doc).toContain("# ADR-005 — Database sharding strategy");
    expect(doc).toContain("Architecture Decision Record");
    expect(doc).not.toContain("{{");

    const artifacts = JSON.parse(readFileSync(join(relicDir, "specs", "002-payments", "artifacts.json"), "utf8"));
    expect(artifacts.external_reads).toEqual(["adr/ADR-005-database-sharding-strategy.md"]);
  });

  test("collision on the computed filename increments NNN", async () => {
    mkdirSync(join(dir, "docs", "fr"), { recursive: true });
    // max id is 1, but the slot FR-002-<slug> is already taken by a hand-made file
    writeFileSync(join(dir, "docs", "fr", "FR-001-a.md"), "x");
    writeFileSync(join(dir, "docs", "fr", "FR-002-session-expiry.md"), "x");
    writeConfig({ fr: "./docs/fr" });
    makeSpec("001-auth");
    const result = await externalJson(["create", "fr", "Session expiry"], { spec: "001-auth" });
    expect(result.filename).toBe("FR-003-session-expiry.md");
  });

  test("commits inside a git repository and reports the sha", async () => {
    const specRepo = join(dir, "spec-repo");
    mkdirSync(join(specRepo, "fr"), { recursive: true });
    const git = (args: string[]) => spawnSync("git", ["-C", specRepo, ...args], { stdio: "pipe" });
    git(["init"]);
    git(["config", "user.email", "test@relic.dev"]);
    git(["config", "user.name", "Relic Test"]);
    writeConfig({ fr: join(specRepo, "fr") });
    makeSpec("001-auth");

    const result = await externalJson(["create", "fr", "Checkout flow"], { spec: "001-auth" });
    expect(result.committed).toBe(true);
    expect(result.commit_sha).toMatch(/^[0-9a-f]{7,}$/);
    expect(result.warning).toBeUndefined();
    const log = git(["log", "--oneline"]).stdout.toString();
    expect(log).toContain("docs(fr): add FR-001");
  });
});

describe("relic external list", () => {
  test("aggregates external_reads across all specs with existence flags", async () => {
    mkdirSync(join(dir, "docs", "fr"), { recursive: true });
    writeFileSync(join(dir, "docs", "fr", "FR-001-auth.md"), "x");
    writeConfig({ fr: "./docs/fr" });
    makeSpec("001-auth", { external_reads: ["fr/FR-001-auth.md", "fr/FR-404-gone.md"] });
    makeSpec("002-payments", { external_reads: ["adr/ADR-001-choice.md"] }); // unconfigured type

    const result = await externalJson(["list"]);
    expect(result.entries).toHaveLength(3);
    const [a, b, c] = result.entries;
    expect(a).toMatchObject({ spec: "001-auth", entry: "fr/FR-001-auth.md", exists: true });
    expect(b).toMatchObject({ spec: "001-auth", entry: "fr/FR-404-gone.md", exists: false });
    expect(c).toMatchObject({ spec: "002-payments", exists: false });
    expect(c.error).toContain("not configured");
  });

  test("--spec filters to one spec and works with no session", async () => {
    writeConfig({ fr: "./docs/fr" });
    makeSpec("001-auth", { external_reads: ["fr/FR-001-auth.md"] });
    makeSpec("002-payments", { external_reads: ["fr/FR-001-auth.md"] });
    const result = await externalJson(["list"], { spec: "002-payments" });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].spec).toBe("002-payments");
  });

  test("returns empty entries when nothing is linked", async () => {
    makeSpec("001-auth");
    expect((await externalJson(["list"])).entries).toEqual([]);
  });
});

describe("legacy context/validate external extensions", () => {
  const { runContext } = require("../commands/context.ts");
  const { runValidate } = require("../commands/validate.ts");

  async function captureJson(fn: () => Promise<void>): Promise<any> {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (msg: string) => logs.push(String(msg));
    try {
      await fn();
    } finally {
      console.log = orig;
    }
    return JSON.parse(logs.join(""));
  }

  test("relic context reports external {configured:false} when unset", async () => {
    makeSpec("001-auth");
    const ctx = await captureJson(() => runContext({ spec: "001-auth", relicDir }));
    expect(ctx.external).toEqual({ configured: false });
    expect(ctx.external_reads).toEqual([]);
  });

  test("relic context reports per-type config and resolved external_reads", async () => {
    mkdirSync(join(dir, "docs", "fr"), { recursive: true });
    writeFileSync(join(dir, "docs", "fr", "FR-001-auth.md"), "x");
    writeConfig({ fr: "./docs/fr", adr: "./missing" });
    makeSpec("001-auth", { external_reads: ["fr/FR-001-auth.md", "fr/FR-404-gone.md"] });

    const ctx = await captureJson(() => runContext({ spec: "001-auth", relicDir }));
    expect(ctx.external.configured).toBe(true);
    expect(ctx.external.types.fr.exists).toBe(true);
    expect(ctx.external.types.fr.resolved_path).toBe(join(dir, "docs", "fr"));
    expect(ctx.external.types.adr.exists).toBe(false);
    expect(ctx.external_reads).toHaveLength(2);
    expect(ctx.external_reads[0]).toMatchObject({ entry: "fr/FR-001-auth.md", type: "fr", exists: true });
    expect(ctx.external_reads[1].exists).toBe(false);
  });

  test("relic validate fails hard on missing, unconfigured, and traversal entries", async () => {
    mkdirSync(join(dir, "docs", "fr"), { recursive: true });
    writeFileSync(join(dir, "docs", "fr", "FR-001-auth.md"), "x");
    writeConfig({ fr: "./docs/fr" });
    makeSpec("001-auth", { external_reads: ["fr/FR-001-auth.md"] });
    makeSpec("002-bad", { external_reads: ["fr/FR-404-gone.md", "adr/ADR-001.md", "fr/../escape.md"] });

    const result = await captureJson(() => runValidate({ relicDir }));
    expect(result.valid).toBe(false);
    expect(result.external_errors).toHaveLength(3);
    const reasons = result.external_errors.map((e: any) => e.reason).join(" | ");
    expect(reasons).toContain("file not found");
    expect(reasons).toContain("not configured");
    expect(reasons).toContain("traversal");
    expect(result.external_errors.every((e: any) => e.spec === "002-bad")).toBe(true);
  });

  test("relic validate passes when all external_reads resolve", async () => {
    mkdirSync(join(dir, "docs", "fr"), { recursive: true });
    writeFileSync(join(dir, "docs", "fr", "FR-001-auth.md"), "x");
    writeConfig({ fr: "./docs/fr" });
    makeSpec("001-auth", { external_reads: ["fr/FR-001-auth.md"] });
    const result = await captureJson(() => runValidate({ relicDir }));
    expect(result.external_errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

});
