import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import {
  discoverEngines,
  ENGINE_SKILL_ROOTS,
  installRelicSkill,
  RELIC_SKILL_FILES,
  type Engine,
} from "../install.ts";

let dir: string;

function files(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  const visit = (path: string) => {
    for (const name of readdirSync(path).sort()) {
      const child = join(path, name);
      if (statSync(child).isDirectory()) {
        visit(child);
      } else {
        result[relative(root, child)] = readFileSync(child, "utf8");
      }
    }
  };
  visit(root);
  return result;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "relic-engine-install-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("thin native engine skill adapters", () => {
  test("copies the same canonical skill into every supported native root", () => {
    for (const engine of ["claude", "copilot", "codex"] satisfies Engine[]) {
      const installed = installRelicSkill({ engine, projectDir: dir });
      expect(installed.path).toBe(
        join(realpathSync(dir), ENGINE_SKILL_ROOTS[engine], "relic"),
      );
      expect(files(installed.path)).toEqual(RELIC_SKILL_FILES);
    }
  });

  test("refresh is idempotent and removes stale Relic-owned files", () => {
    const first = installRelicSkill({ engine: "codex", projectDir: dir });
    writeFileSync(join(first.path, "stale.md"), "obsolete");

    const second = installRelicSkill({ engine: "codex", projectDir: dir });
    expect(files(second.path)).toEqual(RELIC_SKILL_FILES);
    expect(readdirSync(join(dir, ".codex", "skills")).sort()).toEqual([
      "relic",
    ]);
  });

  test("preserves unrelated skills beside the Relic target", () => {
    const other = join(dir, ".claude", "skills", "project-skill");
    mkdirSync(other, { recursive: true });
    writeFileSync(join(other, "SKILL.md"), "project owned");

    installRelicSkill({ engine: "claude", projectDir: dir });
    expect(readFileSync(join(other, "SKILL.md"), "utf8")).toBe("project owned");
  });

  test("discovers only existing project-local engine roots", () => {
    mkdirSync(join(dir, ".claude"));
    mkdirSync(join(dir, ".codex"));
    mkdirSync(join(dir, ".github"));
    expect(discoverEngines(dir)).toEqual(["claude", "codex"]);

    mkdirSync(join(dir, ".github", "skills"));
    expect(discoverEngines(dir)).toEqual(["claude", "copilot", "codex"]);
  });

  test("rejects incomplete embedded content before modifying an engine root", () => {
    expect(() =>
      installRelicSkill({
        engine: "codex",
        projectDir: dir,
        skillFiles: {},
      })
    ).toThrow(/skill is incomplete/);
    expect(readdirSync(dir)).toEqual([]);
  });

  test("rejects embedded paths that could escape the skill root", () => {
    expect(() =>
      installRelicSkill({
        engine: "codex",
        projectDir: dir,
        skillFiles: {
          "SKILL.md": "valid",
          "../outside.md": "escape",
        },
      })
    ).toThrow(/unsafe path/);
    expect(readdirSync(dir)).toEqual([]);
  });

  test("refuses a native engine root that escapes through a symlink", () => {
    const outside = mkdtempSync(join(tmpdir(), "relic-engine-outside-"));
    try {
      symlinkSync(outside, join(dir, ".codex"), "dir");
      expect(() =>
        installRelicSkill({ engine: "codex", projectDir: dir })
      ).toThrow(/escapes the project/);
      expect(readdirSync(outside)).toEqual([]);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
