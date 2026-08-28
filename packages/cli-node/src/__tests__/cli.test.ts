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
      search: ["--json"],
      serve: ["--port"],
      verify: ["--json"],
    });
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

  test("fails a federation-link gate without turning its warning into an error", async () => {
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

    const originalCwd = process.cwd();
    const originalExitCode = process.exitCode;
    try {
      process.chdir(dir);
      process.exitCode = undefined;
      await createProgram().parseAsync([
        "bun",
        "relic",
        "verify",
      ]);
      expect(Number(process.exitCode)).toBe(1);
    } finally {
      process.chdir(originalCwd);
      process.exitCode = originalExitCode ?? 0;
    }
  });
});
