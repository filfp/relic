import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { AddressInfo } from "net";
import { createViewerServer, healthyInstance } from "../commands/serve.ts";

let dir: string;
let relicDir: string;
let base = "";
let server: ReturnType<typeof createViewerServer>;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "relic-serve-test-"));
  relicDir = join(dir, ".relic");
  const specDir = join(relicDir, "specs", "001-auth");
  mkdirSync(specDir, { recursive: true });
  mkdirSync(join(relicDir, "fixes"), { recursive: true });
  writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "html" }));
  writeFileSync(join(specDir, "spec.md"), "# Spec: Auth\n\n**Status:** ready\n**Created:** 2026-07-01\n");
  writeFileSync(join(specDir, "tasks.md"), "### Phase 1 — x\n\n- [x] **T-1** done thing\n- [ ] **T-2** open thing\n");
  writeFileSync(join(specDir, "artifacts.json"), JSON.stringify({ owns: [], reads: [], touches_files: [] }));
  writeFileSync(
    join(specDir, "001-auth.html"),
    `<relic-body>\n<relic-spec-meta/>\n<relic-section title="Overview"><p>hi</p></relic-section>\n<relic-tasks/>\n</relic-body>\n`
  );
  writeFileSync(join(relicDir, "fixes", "2026-07-01-thing.md"), "# Fix: thing\n\n**Status:** solved\n");

  server = createViewerServer(relicDir, "test-1.0");
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("relic serve — JSON API", () => {
  test("health reports identity for same-project reuse", async () => {
    const body = await (await fetch(`${base}/api/health`)).json();
    expect(body).toEqual({ relic: true, project: dir, version: "test-1.0" });
    expect(await healthyInstance((server.address() as AddressInfo).port, dir)).toBe(true);
    expect(await healthyInstance((server.address() as AddressInfo).port, "/other/project")).toBe(false);
  });

  test("project lists specs with derived task counts", async () => {
    const body: any = await (await fetch(`${base}/api/project`)).json();
    expect(body.mode).toBe("html");
    expect(body.specs).toEqual([
      { id: "001-auth", title: "Auth", status: "ready", tasks: { done: 1, total: 2 }, has_html: true },
    ]);
    expect(body.fixes).toEqual([{ id: "2026-07-01-thing", format: "md" }]);
    expect(body.validate.valid).toBe(true);
  });

  test("spec detail: fragment tree + derived data + live markdown", async () => {
    const body: any = await (await fetch(`${base}/api/spec/001-auth`)).json();
    expect(body.lints).toEqual([]);
    expect(body.fragment.some((n: any) => n.tag === "relic-section")).toBe(true);
    expect(body.derived.tasks).toMatchObject({ done: 1, total: 2 });
    expect(body.derived.tasks.phases[0].title).toBe("Phase 1 — x");
    expect(body.files.spec).toContain("# Spec: Auth");
  });

  test("fix detail (md format)", async () => {
    const body: any = await (await fetch(`${base}/api/fix/2026-07-01-thing`)).json();
    expect(body.format).toBe("md");
    expect(body.markdown).toContain("# Fix: thing");
  });

  test("404 for unknown spec/fix/api routes", async () => {
    expect((await fetch(`${base}/api/spec/999-nope`)).status).toBe(404);
    expect((await fetch(`${base}/api/fix/nope`)).status).toBe(404);
    expect((await fetch(`${base}/api/wat`)).status).toBe(404);
  });

  test("read-only: non-GET methods are 405", async () => {
    expect((await fetch(`${base}/api/project`, { method: "POST" })).status).toBe(405);
    expect((await fetch(`${base}/spec/001-auth`, { method: "DELETE" })).status).toBe(405);
  });

  test("serves the app shell at / and as SPA fallback", async () => {
    const root = await fetch(`${base}/`);
    expect(root.headers.get("content-type")).toContain("text/html");
    const fallback = await fetch(`${base}/spec/001-auth`);
    expect(fallback.status).toBe(200);
    expect(await fallback.text()).toContain("<div id=\"root\">");
  });
});
