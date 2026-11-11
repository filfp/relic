import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildSearchFilters,
  isMetadataPlainObject,
  isMetadataScalar,
  isMetadataScalarArray,
  loadFederatedKnowledgeProject,
  loadKnowledgeProject,
  parseMetadataFilter,
  SearchFilterInputError,
  searchFederatedKnowledge,
  searchKnowledge,
  type KnowledgeProject,
} from "../knowledge/index.ts";

const roots: string[] = [];

function write(root: string, path: string, content: string): void {
  const file = join(root, path);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content, "utf8");
}

function writeProject(root: string, members = ""): void {
  write(
    root,
    "relic.yaml",
    `topology:\n  specs: k/specs\n  shared: k/shared\n  records:\n    note: k/notes\n    work: k/work\n${members}`,
  );
  write(root, "k/specs/001-s/index.html", '<relic-body id="001-s"><h1>Spec</h1></relic-body>\n');
  write(root, "k/specs/001-s/evidence.txt", "alpha evidence\n");
  write(root, "k/shared/guide.md", "# Guide\n\nalpha shared body\n");
  write(
    root,
    "k/notes/NOTE-001-a.md",
    "---\nid: NOTE-001\nowner: platform\npriority: 3\ndraft: true\ntags: [auth, api]\nnothing: null\nnested:\n  deep: x\nobjs:\n  - a: 1\nmixed: [auth, {a: 1}]\n---\n\n# A\n\nalpha body, see [work](../work/WORK-001-w.md).\n",
  );
  write(
    root,
    "k/notes/NOTE-002-b.md",
    "---\nid: NOTE-002\nowner: other\npriority: 30\ntags: [ui]\n---\n\n# B\n\nalpha body\n",
  );
  write(root, "k/work/WORK-001-w.md", "---\nid: WORK-001\nowner: platform\n---\n\n# W\n\nbeta body\n");
}

function ids(results: { type: string; id?: string }[]): (string | undefined)[] {
  return results.map((result) => result.id).sort();
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

let project: KnowledgeProject;
let root: string;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "relic-filters-"));
  roots.push(root);
  writeProject(root);
  project = loadKnowledgeProject(root);
});

function meta(...filters: string[]) {
  return buildSearchFilters([], filters);
}

describe("structured search filters (local)", () => {
  test("kind matches a membership", () => {
    expect(ids(searchKnowledge(project, undefined, { kinds: ["note"] })))
      .toEqual(["NOTE-001", "NOTE-002"]);
    expect(ids(searchKnowledge(project, undefined, { kinds: ["work"] })))
      .toEqual(["WORK-001"]);
    expect(searchKnowledge(project, undefined, { kinds: ["shared"] })).toHaveLength(1);
    expect(searchKnowledge(project, undefined, { kinds: ["nope"] })).toEqual([]);
  });

  test("multiple kinds must all be memberships (AND)", () => {
    expect(searchKnowledge(project, undefined, { kinds: ["note", "work"] })).toEqual([]);
  });

  test("presence filter matches any value including null and nested", () => {
    for (const key of ["owner", "nothing", "nested", "objs", "mixed"]) {
      expect(ids(searchKnowledge(project, undefined, meta(key)))).toContain("NOTE-001");
    }
    expect(ids(searchKnowledge(project, undefined, meta("owner"))))
      .toEqual(["NOTE-001", "NOTE-002", "WORK-001"]);
    expect(searchKnowledge(project, undefined, meta("absent"))).toEqual([]);
  });

  test("key=value compares the scalar string form exactly", () => {
    expect(ids(searchKnowledge(project, undefined, meta("owner=platform"))))
      .toEqual(["NOTE-001", "WORK-001"]);
    expect(searchKnowledge(project, undefined, meta("owner=plat"))).toEqual([]);
    expect(searchKnowledge(project, undefined, meta("Owner=platform"))).toEqual([]);
    expect(ids(searchKnowledge(project, undefined, meta("priority=3"))))
      .toEqual(["NOTE-001"]);
    expect(ids(searchKnowledge(project, undefined, meta("draft=true"))))
      .toEqual(["NOTE-001"]);
  });

  test("key=value matches a scalar inside a list", () => {
    expect(ids(searchKnowledge(project, undefined, meta("tags=auth"))))
      .toEqual(["NOTE-001"]);
    expect(ids(searchKnowledge(project, undefined, meta("tags=ui"))))
      .toEqual(["NOTE-002"]);
    expect(ids(searchKnowledge(project, undefined, meta("mixed=auth"))))
      .toEqual(["NOTE-001"]);
  });

  test("null matches only presence; nested and object lists only presence", () => {
    expect(searchKnowledge(project, undefined, meta("nothing=null"))).toEqual([]);
    expect(searchKnowledge(project, undefined, meta("nothing="))).toEqual([]);
    expect(searchKnowledge(project, undefined, meta("nested=x"))).toEqual([]);
    expect(searchKnowledge(project, undefined, meta("nested.deep=x"))).toEqual([]);
    expect(searchKnowledge(project, undefined, meta("objs=1"))).toEqual([]);
    expect(searchKnowledge(project, undefined, meta("mixed=1"))).toEqual([]);
  });

  test("all filters and the query combine with AND", () => {
    const filters = buildSearchFilters(["note"], ["owner=platform", "tags=api"]);
    expect(ids(searchKnowledge(project, undefined, filters))).toEqual(["NOTE-001"]);
    expect(ids(searchKnowledge(project, "alpha", filters))).toEqual(["NOTE-001"]);
    expect(searchKnowledge(project, "beta", filters)).toEqual([]);
    expect(ids(searchKnowledge(project, "alpha", { kinds: ["note"] })))
      .toEqual(["NOTE-001", "NOTE-002"]);
  });

  test("artifacts are excluded whenever a kind or metadata filter is present", () => {
    expect(searchKnowledge(project, "alpha").some((r) => r.type === "artifact")).toBe(true);
    for (const filters of [{ kinds: ["note"] }, meta("owner")]) {
      expect(searchKnowledge(project, "alpha", filters).some((r) => r.type === "artifact"))
        .toBe(false);
    }
  });

  test("no query and no filter matches nothing; absence yields no diagnostics", () => {
    expect(searchKnowledge(project, undefined)).toEqual([]);
    expect(searchKnowledge(project, "  ", {})).toEqual([]);
    const before = JSON.stringify(project.diagnostics);
    searchKnowledge(project, undefined, meta("absent"));
    expect(JSON.stringify(project.diagnostics)).toBe(before);
    expect(project.diagnostics.some((item) => /metadata|absent/.test(item.message)))
      .toBe(false);
  });

  test("results carry outgoing links and backlinks from the read model", () => {
    const [note] = searchKnowledge(project, undefined, meta("tags=auth"));
    const [work] = searchKnowledge(project, undefined, { kinds: ["work"] });
    if (note?.type !== "document" || work?.type !== "document") throw new Error("missing");
    expect(note.links.map((link) => link.targetPath)).toEqual([work.path]);
    expect(work.backlinks.map((link) => link.sourcePath)).toEqual([note.path]);
  });
});

describe("structured search filters (federated)", () => {
  test("filters apply to composed documents and keep project addresses", () => {
    const parent = mkdtempSync(join(tmpdir(), "relic-filters-fed-"));
    roots.push(parent);
    const child = join(parent, "child");
    mkdirSync(child);
    writeProject(child);
    writeProject(parent, "federation:\n  members:\n    child: child\n");
    const aggregate = loadFederatedKnowledgeProject(parent);

    const results = searchFederatedKnowledge(aggregate, undefined, buildSearchFilters(["note"], ["owner=platform"]));
    expect(results.map((r) => (r.type === "document" ? [r.project.join("/"), r.id] : []))).toEqual([
      ["root", "NOTE-001"],
      ["root/child", "NOTE-001"],
    ]);
    const first = results[0];
    if (first?.type !== "document") throw new Error("expected document");
    expect(first.links.map((link) => link.source.project.join("/"))).toEqual(["root"]);

    const queried = searchFederatedKnowledge(aggregate, "alpha", meta("tags=ui"));
    expect(queried.map((r) => (r.type === "document" ? r.project.join("/") : "artifact")))
      .toEqual(["root", "root/child"]);
    expect(searchFederatedKnowledge(aggregate, "alpha", meta("owner")).some((r) =>
      r.type === "artifact"
    )).toBe(false);
    expect(searchFederatedKnowledge(aggregate, "alpha").some((r) => r.type === "artifact"))
      .toBe(true);
    expect(searchFederatedKnowledge(aggregate, undefined)).toEqual([]);
  });
});

describe("filter input parsing", () => {
  test("plain forms", () => {
    expect(parseMetadataFilter("owner")).toEqual([{ key: "owner" }]);
    expect(parseMetadataFilter("owner=a=b")).toEqual([{ key: "owner", value: "a=b" }]);
    expect(parseMetadataFilter("owner=")).toEqual([{ key: "owner", value: "" }]);
    expect(() => parseMetadataFilter("=x")).toThrow(SearchFilterInputError);
  });

  test("JSON object form", () => {
    expect(parseMetadataFilter(
      '{"owner":"platform","priority":3,"draft":true,"nothing":null,"tags":["auth","api"]}',
    )).toEqual([
      { key: "owner", value: "platform" },
      { key: "priority", value: "3" },
      { key: "draft", value: "true" },
      { key: "nothing" },
      { key: "tags", value: "auth" },
      { key: "tags", value: "api" },
    ]);
    expect(parseMetadataFilter('{"a.b":"x"}')).toEqual([{ key: "a.b", value: "x" }]);
  });

  test("JSON input errors are input errors", () => {
    for (const bad of ['{"a":', '{"a":{"b":1}}', '{"a":[{"b":1}]}', '{"a":[["x"]]}']) {
      expect(() => parseMetadataFilter(bad)).toThrow(SearchFilterInputError);
    }
  });

  test("buildSearchFilters mixes and repeats forms", () => {
    expect(buildSearchFilters(["a"], ['{"x":"1"}', "y", "z=2"])).toEqual({
      kinds: ["a"],
      metadata: [{ key: "x", value: "1" }, { key: "y" }, { key: "z", value: "2" }],
    });
    expect(() => buildSearchFilters([" "], [])).toThrow(SearchFilterInputError);
  });
});

describe("shared metadata shape rule", () => {
  test("classifies scalars, scalar lists and plain objects", () => {
    expect(["a", 1, true, null].every(isMetadataScalar)).toBe(true);
    expect([undefined, {}, [], new Date()].some(isMetadataScalar)).toBe(false);
    expect(isMetadataScalarArray(["a", 1, null])).toBe(true);
    expect(isMetadataScalarArray(["a", {}])).toBe(false);
    expect(isMetadataPlainObject({})).toBe(true);
    expect(isMetadataPlainObject([])).toBe(false);
    expect(isMetadataPlainObject(null)).toBe(false);
  });
});
