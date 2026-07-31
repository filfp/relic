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

function portableSkillFiles(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(RELIC_SKILL_FILES).filter(
      ([path]) => path !== "agents/openai.yaml",
    ),
  );
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "relic-engine-install-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("thin native engine skill adapters", () => {
  test("installs the portable skill and confines OpenAI metadata to codex", () => {
    const portableFiles = portableSkillFiles();
    for (const engine of [
      "claude",
      "copilot",
      "codex",
      "agents",
    ] satisfies Engine[]) {
      const installed = installRelicSkill({ engine, projectDir: dir });
      expect(installed.path).toBe(
        join(realpathSync(dir), ENGINE_SKILL_ROOTS[engine], "relic"),
      );
      expect(files(installed.path)).toEqual(
        engine === "codex" ? RELIC_SKILL_FILES : portableFiles,
      );
    }
  });

  test("refresh removes stale and host-inapplicable Relic files", () => {
    const first = installRelicSkill({ engine: "claude", projectDir: dir });
    writeFileSync(join(first.path, "stale.md"), "obsolete");
    mkdirSync(join(first.path, "agents"));
    writeFileSync(join(first.path, "agents", "openai.yaml"), "stale metadata");

    const second = installRelicSkill({ engine: "claude", projectDir: dir });
    expect(files(second.path)).toEqual(portableSkillFiles());
    expect(readdirSync(join(dir, ".claude", "skills")).sort()).toEqual([
      "relic",
    ]);
  });

  test("keeps the installed skill when staging the replacement fails", () => {
    const installed = installRelicSkill({ engine: "codex", projectDir: dir });
    const previous = files(installed.path);

    expect(() =>
      installRelicSkill({
        engine: "codex",
        projectDir: dir,
        skillFiles: {
          "SKILL.md": "replacement",
          collision: "file",
          "collision/child.md": "cannot be written below a file",
        },
      })
    ).toThrow();
    expect(files(installed.path)).toEqual(previous);
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
    mkdirSync(join(dir, ".agents", "skills"), { recursive: true });
    mkdirSync(join(dir, ".github"));
    expect(discoverEngines(dir)).toEqual(["claude", "codex", "agents"]);

    mkdirSync(join(dir, ".github", "skills"));
    expect(discoverEngines(dir)).toEqual([
      "claude",
      "copilot",
      "codex",
      "agents",
    ]);
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
