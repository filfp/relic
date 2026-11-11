import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createProgram } from "../bin.ts";

let dir: string;
let originalLog: typeof console.log;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "relic-cli-"));
  originalLog = console.log;
  console.log = () => {};
});

afterEach(() => {
  console.log = originalLog;
  rmSync(dir, { recursive: true, force: true });
});

describe("Relic 2.0 CLI surface", () => {
  test("registers exactly the five approved product commands", () => {
    const program = createProgram();
    expect(program.commands.map((command) => command.name())).toEqual([
      "init",
      "install",
      "search",
      "serve",
      "verify",
    ]);
    expect(program.helpInformation()).not.toContain("validate");
    expect(program.helpInformation()).not.toContain("specify");
  });

  test("exposes only the accepted command-specific options", () => {
    const program = createProgram();
    const options = Object.fromEntries(
      program.commands.map((command) => [
        command.name(),
        command.options.map((option) => option.long),
      ]),
    );
    expect(options).toEqual({
      init: ["--dir"],
      install: ["--engine"],
      search: ["--kind", "--meta", "--json"],
      serve: ["--port"],
      verify: ["--json"],
    });
  });

  test("parses repeatable search filters and makes the query optional", async () => {
    const calls: string[] = [];
    const originalError = console.error;
    console.error = () => {};
    const originalCwd = process.cwd();
    try {
      process.chdir(join(import.meta.dir, "../../../core/src/__fixtures__/relic-2-project"));
      console.log = (value?: unknown) => calls.push(String(value));
      await createProgram().parseAsync([
        "bun", "relic", "search", "--kind", "fr", "--kind", "adr",
        "--meta", "priority=essential", "--meta", '{"x":1}', "--json",
      ]);
      expect(JSON.parse(calls.at(-1) ?? "")).toMatchObject({
        formatVersion: 1,
        query: "",
        results: [],
      });
      calls.length = 0;
      await createProgram().parseAsync([
        "bun", "relic", "search", "--meta", "priority=essential", "--json",
      ]);
      expect(JSON.parse(calls.at(-1) ?? "").results).toHaveLength(1);
      await expect(createProgram().parseAsync(["bun", "relic", "search"]))
        .rejects.toThrow(/query or at least one/);
      await expect(createProgram().parseAsync([
        "bun", "relic", "search", "--meta", '{"a":', "--json",
      ])).rejects.toThrow(/JSON/);
    } finally {
      process.chdir(originalCwd);
      console.error = originalError;
    }
  });

  test("executes init through the public CLI contract", async () => {
    await createProgram().parseAsync([
      "bun",
      "relic",
      "init",
      "--dir",
      dir,
    ]);
    expect(existsSync(join(dir, "relic.yaml"))).toBe(true);
    expect(existsSync(join(dir, ".relic"))).toBe(false);
  });

  test("fails a federation-link gate without mutating the test process", () => {
    const backend = join(dir, "backend");
    mkdirSync(join(dir, "knowledge/specs"), { recursive: true });
    mkdirSync(join(dir, "knowledge/shared"), { recursive: true });
    mkdirSync(join(backend, "knowledge/specs"), { recursive: true });
    mkdirSync(join(backend, "knowledge/shared"), { recursive: true });
    mkdirSync(join(backend, "knowledge/notes"), { recursive: true });
    writeFileSync(
      join(dir, "relic.yaml"),
      "topology:\n  specs: knowledge/specs\n  shared: knowledge/shared\n  records: {}\nfederation:\n  members:\n    backend: backend\n",
    );
    writeFileSync(
      join(backend, "relic.yaml"),
      "topology:\n  specs: knowledge/specs\n  shared: knowledge/shared\n  records:\n    note: knowledge/notes\n",
    );
    writeFileSync(
      join(backend, "knowledge/notes/NOTE-001.md"),
      "---\nid: NOTE-001\n---\n\n[Outside](../../../outside.md)\n",
    );

    const result = Bun.spawnSync(
      [process.execPath, join(import.meta.dir, "../bin.ts"), "verify"],
      { cwd: dir, stdout: "pipe", stderr: "pipe" },
    );

    expect(result.exitCode).toBe(1);
  });
});
