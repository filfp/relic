import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { runSearch } from "../commands/search.ts";

const fixture = join(
  import.meta.dir,
  "../../../core/src/__fixtures__/relic-2-project",
);
let lines: string[];
let originalLog: typeof console.log;

function snapshot(root: string): Array<[string, string, number]> {
  const entries: Array<[string, string, number]> = [];
  const visit = (path: string) => {
    for (const name of readdirSync(path).sort()) {
      const child = join(path, name);
      const stat = statSync(child);
      if (stat.isDirectory()) {
        visit(child);
      } else {
        entries.push([
          relative(root, child),
          readFileSync(child).toString("base64"),
          stat.mtimeMs,
        ]);
      }
    }
  };
  visit(root);
  return entries;
}

beforeEach(() => {
  lines = [];
  originalLog = console.log;
  console.log = (value?: unknown) => lines.push(String(value));
});

afterEach(() => {
  console.log = originalLog;
});

describe("Relic 2.0 search command", () => {
  test("searches IDs, metadata, memberships, paths, and content", async () => {
    expect((await runSearch({ query: "fr-001", projectDir: fixture })).results)
      .toContainEqual(
        expect.objectContaining({
          type: "document",
          id: "FR-001",
          memberships: ["fr"],
        }),
      );
    expect((await runSearch({ query: "essential", projectDir: fixture })).results)
      .toEqual([
        expect.objectContaining({ type: "document", id: "FR-001" }),
      ]);
    expect((await runSearch({ query: "legacy session", projectDir: fixture })).results)
      .toEqual([
        expect.objectContaining({
          type: "artifact",
          path: "knowledge/specs/001-auth/notes.md",
        }),
      ]);
    expect((await runSearch({ query: "BR-001", projectDir: fixture })).results)
      .toContainEqual(
        expect.objectContaining({
          type: "document",
          id: "BR-001",
          memberships: ["br"],
        }),
      );
    expect((await runSearch({ query: "refresh-token family", projectDir: fixture })).results)
      .toContainEqual(
        expect.objectContaining({
          type: "document",
          id: "GL-001",
          memberships: ["gl"],
        }),
      );
  });

  test("emits the same exhaustive result model as JSON", async () => {
    const output = await runSearch({
      query: "authentication",
      json: true,
      projectDir: fixture,
    });
    expect(JSON.parse(lines.at(-1) ?? "")).toEqual(output);
    expect(output.results.some((result) => result.type === "document")).toBe(true);
    expect(output.results.some((result) => result.type === "artifact")).toBe(true);
  });

  test("uses a concise human projection by default", async () => {
    await runSearch({ query: "FR-001", projectDir: fixture });
    expect(lines[0]).toContain("Relic search: FR-001");
    expect(lines).toContain("[document] FR-001 — Authenticate valid credentials");
    expect(lines).toContain(
      "  path: knowledge/records/requirements/FR-001-login.md",
    );
  });

  test("rejects an empty query and unreadable topology", async () => {
    await expect(runSearch({ query: " ", projectDir: fixture })).rejects.toThrow(
      /cannot be empty/,
    );

    const malformed = mkdtempSync(join(tmpdir(), "relic-search-malformed-"));
    try {
      writeFileSync(join(malformed, "relic.yaml"), "project: no topology\n");
      await expect(
        runSearch({ query: "anything", projectDir: malformed }),
      ).rejects.toThrow(/topology is unavailable/);
    } finally {
      rmSync(malformed, { recursive: true, force: true });
    }
  });

  test("does not mutate project knowledge", async () => {
    const before = snapshot(fixture);
    await runSearch({ query: "auth", projectDir: fixture });
    expect(snapshot(fixture)).toEqual(before);
  });
});
