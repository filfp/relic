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
  rmSync,
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
  test("registers exactly the four approved product commands", () => {
    const program = createProgram();
    expect(program.commands.map((command) => command.name())).toEqual([
      "init",
      "install",
      "search",
      "serve",
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
    expect(existsSync(join(dir, ".relic", "RELIC.md"))).toBe(true);
    expect(existsSync(join(dir, ".relic", "specs"))).toBe(true);
    expect(existsSync(join(dir, ".relic", "shared"))).toBe(true);
  });
});
