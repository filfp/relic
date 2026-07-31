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
  findRelicProjectRoot,
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
  test("requires the root relic.yaml entry", () => {
    const root = temporaryRoot();
    expect(isRelicProjectRoot(root)).toBe(false);
    expect(() => resolveRelicProjectDir(root)).toThrow(/Missing relic\.yaml/);

    writeFileSync(join(root, "relic.yaml"), "topology: {}\n");
    expect(isRelicProjectRoot(root)).toBe(true);
    expect(resolveRelicProjectDir(root)).toBe(root);
  });

  test("ignores a nested legacy directory while finding the valid parent", () => {
    const root = temporaryRoot();
    writeFileSync(join(root, "relic.yaml"), "topology: {}\n");
    const nested = join(root, "packages", "feature");
    mkdirSync(join(nested, ".relic"), { recursive: true });

    expect(findRelicProjectRoot(nested)).toBe(root);
  });

  test("does not trust a symlinked project authority", () => {
    const root = temporaryRoot();
    const external = temporaryRoot();
    const externalConfig = join(external, "relic.yaml");
    writeFileSync(externalConfig, "topology: {}\n");
    symlinkSync(externalConfig, join(root, "relic.yaml"));

    expect(isRelicProjectRoot(root)).toBe(false);
  });
});
