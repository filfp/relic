import { describe, test, expect } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { extractSpecHtmlParts } from "../core/html-rebase.ts";

/** A pre-012 (legacy) spec HTML: header + relic-body, full-document chrome. */
const LEGACY_HTML = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <title>004-cli-self-upgrade — CLI Self Upgrade</title>
  <style>.h-id{color:red}</style>
</head>
<body>
<script>/* legacy component chrome */</script>
<header id="relic-header">
  <span class="h-id">004-cli-self-upgrade</span>
  <span class="h-title">CLI Self Upgrade</span>
</header>
<div id="relic-body">
<section>
  <h2>Overview</h2>
  <p>Authored overview with $pecial ch$racters.</p>
  <div class="grid-2"><div>nested</div><div>divs</div></div>
</section>
</div>
</body>
</html>
`;

describe("extractSpecHtmlParts (legacy extractor for viewer-migrate)", () => {
  test("extracts id, title, and body from a legacy full document", () => {
    const parts = extractSpecHtmlParts(LEGACY_HTML);
    expect(parts).not.toBeNull();
    expect(parts!.specId).toBe("004-cli-self-upgrade");
    expect(parts!.title).toBe("CLI Self Upgrade");
    expect(parts!.bodyBlock).toContain("Authored overview");
    expect(parts!.bodyBlock.startsWith('<div id="relic-body">')).toBe(true);
    expect(parts!.bodyBlock.endsWith("</div>")).toBe(true);
  });

  test("falls back to <title> when header spans are missing", () => {
    const html = LEGACY_HTML.replace(/<span class="h-id">.*<\/span>/, "").replace(
      /<span class="h-title">.*<\/span>/,
      ""
    );
    const parts = extractSpecHtmlParts(html);
    expect(parts).not.toBeNull();
    expect(parts!.specId).toBe("004-cli-self-upgrade");
  });

  test("returns null when there is no #relic-body", () => {
    expect(extractSpecHtmlParts("<html><body><p>free-form</p></body></html>")).toBeNull();
  });
});

describe("viewer-migrate", () => {
  test("converts a legacy spec document into a lint-clean fragment", async () => {
    const { migrateProject } = await import("../commands/viewer-migrate.ts");
    const { parseFragment } = await import("../core/fragment.ts");
    const dir = mkdtempSync(join(tmpdir(), "relic-migrate-"));
    try {
      const relicDir = join(dir, ".relic");
      const specDir = join(relicDir, "specs", "004-cli-self-upgrade");
      mkdirSync(specDir, { recursive: true });
      mkdirSync(join(relicDir, "fixes"), { recursive: true });
      writeFileSync(join(specDir, "004-cli-self-upgrade.html"), LEGACY_HTML);
      writeFileSync(join(relicDir, "base.html"), "<!DOCTYPE html><html></html>");

      const report = migrateProject(relicDir);
      expect(report.converted.map((c) => c.file)).toEqual(["specs/004-cli-self-upgrade/004-cli-self-upgrade.html"]);
      expect(report.failed).toEqual([]);
      expect(report.base_html_removed).toBe(true);

      const fragment = readFileSync(join(specDir, "004-cli-self-upgrade.html"), "utf8");
      expect(fragment.trim().startsWith("<relic-body>")).toBe(true);
      expect(fragment).toContain("<relic-spec-meta/>");
      expect(fragment).toContain("<relic-section>");
      expect(fragment).toContain("Authored overview with $pecial ch$racters.");
      expect(fragment).not.toContain("<script");

      const parsed = parseFragment(fragment);
      expect(parsed.legacy).toBe(false);
      expect(parsed.lints.filter((l) => l.level === "error")).toEqual([]);

      // idempotent: second run reports already-migrated
      const again = migrateProject(relicDir);
      expect(again.converted).toEqual([]);
      expect(again.already_fragments).toContain("specs/004-cli-self-upgrade/004-cli-self-upgrade.html");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("scaffold html creation (spec 012: fragments)", () => {
  test("a freshly scaffolded spec HTML is a <relic-body> fragment", async () => {
    const { runScaffold } = await import("../commands/scaffold.ts");
    const dir = mkdtempSync(join(tmpdir(), "relic-scaffold-embed-"));
    const relicDir = join(dir, ".relic");
    mkdirSync(join(relicDir, "specs"), { recursive: true });
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "html" }));
    try {
      await runScaffold({ title: "Demo Feature", relicDir });
      const html = readFileSync(
        join(relicDir, "specs", "001-demo-feature", "001-demo-feature.html"),
        "utf8"
      );
      expect(html.trim().startsWith("<relic-body>")).toBe(true);
      expect(html).toContain("<relic-spec-meta/>");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("relic-src-spec");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
