import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runVerify } from "../commands/verify.ts";

const temporaryDirectories: string[] = [];
let lines: string[];
let originalLog: typeof console.log;

function createProject(): string {
  const directory = mkdtempSync(join(tmpdir(), "relic-verify-"));
  temporaryDirectories.push(directory);
  return directory;
}

function writeProject(
  directory: string,
  members: Record<string, string> = {},
  note = "",
): void {
  mkdirSync(join(directory, "knowledge/specs/001-same"), { recursive: true });
  mkdirSync(join(directory, "knowledge/shared"), { recursive: true });
  mkdirSync(join(directory, "knowledge/notes"), { recursive: true });
  writeFileSync(
    join(directory, "knowledge/specs/001-same/index.html"),
    '<relic-body id="001-same"><h1>Same specification</h1></relic-body>\n',
  );
  writeFileSync(
    join(directory, "knowledge/notes/NOTE-001-same.md"),
    `---\nid: NOTE-001\n---\n\n# Same note\n\n${note}\n`,
  );
  const federation = Object.keys(members).length === 0
    ? ""
    : `federation:\n  members:\n${Object.entries(members)
      .map(([key, path]) => `    ${key}: ${path}\n`)
      .join("")}`;
  writeFileSync(
    join(directory, "relic.yaml"),
    "topology:\n  specs: knowledge/specs\n  shared: knowledge/shared\n  records:\n    note: knowledge/notes\n" + federation,
  );
}

beforeEach(() => {
  lines = [];
  originalLog = console.log;
  console.log = (value?: unknown) => lines.push(String(value));
});

afterEach(() => {
  console.log = originalLog;
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("Relic verify command", () => {
  test("reports upward and cross-branch member links as gate warnings", async () => {
    const root = createProject();
    const backend = join(root, "backend");
    const frontend = join(root, "frontend");
    writeProject(backend, {}, [
      "[Root](../../../knowledge/notes/NOTE-001-same.md)",
      "[Frontend](../../../frontend/knowledge/notes/NOTE-001-same.md)",
    ].join("\n\n"));
    writeProject(frontend);
    writeProject(root, { backend: "backend", frontend: "frontend" });

    const output = await runVerify({
      json: true,
      projectDir: root,
    });

    expect(output.valid).toBe(false);
    expect(output.diagnostics.filter((item) =>
      item.diagnostic.code === "federated-outbound-link"
    )).toEqual([
      expect.objectContaining({
        project: ["root", "backend"],
        diagnostic: expect.objectContaining({
          code: "federated-outbound-link",
          href: "../../../frontend/knowledge/notes/NOTE-001-same.md",
        }),
      }),
      expect.objectContaining({
        project: ["root", "backend"],
        diagnostic: expect.objectContaining({
          code: "federated-outbound-link",
          href: "../../../knowledge/notes/NOTE-001-same.md",
        }),
      }),
    ]);
    expect(JSON.parse(lines.at(-1) ?? "")).toEqual(output);
  });

  test("does not flag root links, external URLs, or unsafe protocols", async () => {
    const root = createProject();
    const backend = join(root, "backend");
    writeProject(backend, {}, [
      "[External](https://example.com)",
      "[Protocol](file:///private/secret.txt)",
    ].join("\n\n"));
    writeProject(root, { backend: "backend" }, "[Missing](../outside.md)");

    const output = await runVerify({ projectDir: root });

    expect(output.valid).toBe(false);
    expect(output.diagnostics).not.toContainEqual(expect.objectContaining({
      diagnostic: expect.objectContaining({ code: "federated-outbound-link" }),
    }));
    expect(lines[0]).toBe("Relic verify: failed (2 issues)");
  });
});
