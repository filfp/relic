import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  findRelicDir,
  isRelicProjectRoot,
  resolveRelicProjectDir,
} from "../project.ts";

const roots: string[] = [];

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "relic-project-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Relic 2.0 project boundary", () => {
  test("requires the canonical project entry", () => {
    const root = temporaryRoot();
    mkdirSync(join(root, ".relic"));
    expect(isRelicProjectRoot(root)).toBe(false);
    expect(() => resolveRelicProjectDir(root)).toThrow(/Missing \.relic\/RELIC\.md/);

    writeFileSync(join(root, ".relic", "RELIC.md"), "# Relic\n");
    expect(isRelicProjectRoot(root)).toBe(true);
    expect(resolveRelicProjectDir(root)).toBe(root);
  });

  test("skips a nested legacy directory while searching for a valid parent", () => {
    const root = temporaryRoot();
    mkdirSync(join(root, ".relic"));
    writeFileSync(join(root, ".relic", "RELIC.md"), "# Relic\n");
    const nested = join(root, "packages", "feature");
    mkdirSync(join(nested, ".relic"), { recursive: true });

    expect(findRelicDir(nested)).toBe(join(root, ".relic"));
  });

  test("does not trust symlinked project authority", () => {
    const root = temporaryRoot();
    const external = temporaryRoot();
    writeFileSync(join(external, "RELIC.md"), "# external\n");
    symlinkSync(external, join(root, ".relic"));

    expect(isRelicProjectRoot(root)).toBe(false);
  });
});
