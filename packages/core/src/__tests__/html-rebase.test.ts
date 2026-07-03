import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { extractSpecHtmlParts, rebaseSpecHtml } from "../core/html-rebase.ts";
import { syncSpecHtml, syncAllSpecHtml, refreshBaseHtml } from "../commands/html-sync.ts";
import { TEMPLATES } from "../generated/templates.ts";

const BASE = TEMPLATES["base.html"] ?? "";

function renderBase(specId: string, title: string): string {
  return BASE
    .replace(/\{\{SPEC_ID\}\}/g, specId)
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{DATE\}\}/g, "2026-07-02");
}

/** A pre-sentinel (legacy) spec HTML: header + relic-body, no reader, no sentinels. */
const LEGACY_HTML = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <title>004-cli-self-upgrade — CLI Self Upgrade</title>
  <style>.h-id{color:red}</style>
</head>
<body>
<script>/* old component script with </div> inside a string? no — plain */</script>
<header id="relic-header">
  <span class="h-id">004-cli-self-upgrade</span>
  <span class="h-title">CLI Self Upgrade</span>
</header>
<div id="relic-body">
<section>
  <h2>Overview</h2>
  <p>Authored overview with $pecial ch$racters and $' replacement traps.</p>
  <div class="grid-2"><div>nested</div><div>divs</div></div>
</section>
</div>
</body>
</html>
`;

describe("extractSpecHtmlParts", () => {
  test("extracts id, title, and body from a legacy file without sentinels", () => {
    const parts = extractSpecHtmlParts(LEGACY_HTML);
    expect(parts).not.toBeNull();
    expect(parts!.specId).toBe("004-cli-self-upgrade");
    expect(parts!.title).toBe("CLI Self Upgrade");
    expect(parts!.bodyBlock).toContain("Authored overview");
    expect(parts!.bodyBlock).toContain('<div class="grid-2"><div>nested</div><div>divs</div></div>');
    expect(parts!.bodyBlock.startsWith('<div id="relic-body">')).toBe(true);
    expect(parts!.bodyBlock.endsWith("</div>")).toBe(true);
  });

  test("extracts from a current-template file via sentinels", () => {
    const html = renderBase("001-auth", "Auth");
    const parts = extractSpecHtmlParts(html);
    expect(parts).not.toBeNull();
    expect(parts!.specId).toBe("001-auth");
    expect(parts!.title).toBe("Auth");
    expect(parts!.bodyBlock).toContain("<h2>Overview</h2>");
  });

  test("falls back to <title> when header spans are missing", () => {
    const html = LEGACY_HTML.replace(/<span class="h-id">.*<\/span>/, "").replace(
      /<span class="h-title">.*<\/span>/,
      ""
    );
    const parts = extractSpecHtmlParts(html);
    expect(parts).not.toBeNull();
    expect(parts!.specId).toBe("004-cli-self-upgrade");
    expect(parts!.title).toBe("CLI Self Upgrade");
  });

  test("returns null when there is no #relic-body", () => {
    expect(extractSpecHtmlParts("<html><body><p>free-form fix doc</p></body></html>")).toBeNull();
  });

  test("extracts embedded markdown source blocks", () => {
    const html = renderBase("001-auth", "Auth").replace(
      '<script type="text/plain" id="relic-src-spec"></script>',
      '<script type="text/plain" id="relic-src-spec"># Spec\n\n- [x] done item<\\/script escaped</script>'
    );
    const parts = extractSpecHtmlParts(html);
    expect(parts!.srcSpec).toContain("# Spec");
    expect(parts!.srcSpec).toContain("<\\/script escaped");
  });
});

describe("rebaseSpecHtml", () => {
  test("carries legacy content onto the current template", () => {
    const out = rebaseSpecHtml(LEGACY_HTML, BASE, "2026-07-02");
    expect(out).not.toBeNull();
    // chrome is current: sentinels, reader, docs template all present
    expect(out!).toContain("relic:content:start");
    expect(out!).toContain("relic:sources:start");
    expect(out!).toContain('id="relic-src-spec"');
    expect(out!).toContain("Inline Markdown Reader");
    // authored content preserved verbatim (including $ sequences)
    expect(out!).toContain("Authored overview with $pecial ch$racters and $' replacement traps.");
    // identity preserved
    expect(out!).toContain('<span class="h-id">004-cli-self-upgrade</span>');
    expect(out!).toContain("<title>004-cli-self-upgrade — CLI Self Upgrade</title>");
    // old chrome gone
    expect(out!).not.toContain(".h-id{color:red}");
  });

  test("is idempotent — rebasing a rebased file changes nothing", () => {
    const once = rebaseSpecHtml(LEGACY_HTML, BASE, "2026-07-02")!;
    const twice = rebaseSpecHtml(once, BASE, "2026-07-02")!;
    expect(twice).toBe(once);
  });

  test("preserves populated source blocks across a rebase", () => {
    const withSrc = rebaseSpecHtml(LEGACY_HTML, BASE, "2026-07-02")!.replace(
      '<script type="text/plain" id="relic-src-tasks"></script>',
      '<script type="text/plain" id="relic-src-tasks">- [ ] task one</script>'
    );
    const again = rebaseSpecHtml(withSrc, BASE, "2026-07-02")!;
    expect(again).toContain(
      '<script type="text/plain" id="relic-src-tasks">- [ ] task one</script>'
    );
  });

  test("returns null for unrecognisable files", () => {
    expect(rebaseSpecHtml("<html><body>nope</body></html>", BASE, "2026-07-02")).toBeNull();
  });
});

describe("syncSpecHtml / syncAllSpecHtml", () => {
  let dir: string;
  let relicDir: string;
  let specsDir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "relic-htmlsync-test-"));
    relicDir = join(dir, ".relic");
    specsDir = join(relicDir, "specs");
    mkdirSync(join(specsDir, "004-cli-self-upgrade"), { recursive: true });
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "html" }));
    writeFileSync(
      join(specsDir, "004-cli-self-upgrade", "004-cli-self-upgrade.html"),
      LEGACY_HTML
    );
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("rebases a legacy file in place", () => {
    expect(syncSpecHtml(specsDir, "004-cli-self-upgrade")).toBe("synced");
    const html = readFileSync(
      join(specsDir, "004-cli-self-upgrade", "004-cli-self-upgrade.html"),
      "utf8"
    );
    expect(html).toContain("relic:content:start");
    expect(html).toContain("Authored overview");
  });

  test("embeds markdown files into the reader source blocks, escaping </script", () => {
    const specDir = join(specsDir, "004-cli-self-upgrade");
    writeFileSync(join(specDir, "spec.md"), "# Spec\n\nCode: `</script>` inside markdown.\n");
    writeFileSync(join(specDir, "tasks.md"), "- [x] first task\n- [ ] second task\n");
    expect(syncSpecHtml(specsDir, "004-cli-self-upgrade")).toBe("synced");
    const html = readFileSync(join(specDir, "004-cli-self-upgrade.html"), "utf8");
    expect(html).toContain('id="relic-src-spec"># Spec');
    expect(html).toContain("Code: `<\\/script>` inside markdown.");
    expect(html).toContain('id="relic-src-tasks">- [x] first task');
    // plan.md does not exist — its block stays empty
    expect(html).toContain('<script type="text/plain" id="relic-src-plan"></script>');
  });

  test("re-sync after a markdown edit refreshes the embedded source", () => {
    const specDir = join(specsDir, "004-cli-self-upgrade");
    writeFileSync(join(specDir, "spec.md"), "old content\n");
    syncSpecHtml(specsDir, "004-cli-self-upgrade");
    writeFileSync(join(specDir, "spec.md"), "new content\n");
    expect(syncSpecHtml(specsDir, "004-cli-self-upgrade")).toBe("synced");
    const html = readFileSync(join(specDir, "004-cli-self-upgrade.html"), "utf8");
    expect(html).toContain("new content");
    expect(html).not.toContain("old content");
  });

  test("second sync reports unchanged", () => {
    syncSpecHtml(specsDir, "004-cli-self-upgrade");
    expect(syncSpecHtml(specsDir, "004-cli-self-upgrade")).toBe("unchanged");
  });

  test("reports missing when the spec has no HTML file", () => {
    mkdirSync(join(specsDir, "005-other"), { recursive: true });
    expect(syncSpecHtml(specsDir, "005-other")).toBe("missing");
  });

  test("skips files it cannot parse and leaves them untouched", () => {
    const weird = join(specsDir, "004-cli-self-upgrade", "004-cli-self-upgrade.html");
    writeFileSync(weird, "<html><body>hand-rolled</body></html>");
    expect(syncSpecHtml(specsDir, "004-cli-self-upgrade")).toBe("skipped");
    expect(readFileSync(weird, "utf8")).toBe("<html><body>hand-rolled</body></html>");
  });

  test("syncAllSpecHtml refreshes base.html and walks all specs", () => {
    const result = syncAllSpecHtml(relicDir);
    expect(result.mode).toBe("html");
    expect(result.base_html_updated).toBe(true);
    expect(result.specs).toEqual([
      {
        spec: "004-cli-self-upgrade",
        file: "specs/004-cli-self-upgrade/004-cli-self-upgrade.html",
        status: "synced",
      },
    ]);
    const base = readFileSync(join(relicDir, "base.html"), "utf8");
    expect(base).toContain("Relic Component Library");
  });

  test("syncAllSpecHtml is a no-op in md mode", () => {
    writeFileSync(join(relicDir, "config.json"), JSON.stringify({ engines: [], mode: "md" }));
    const result = syncAllSpecHtml(relicDir);
    expect(result.mode).toBe("md");
    expect(result.specs).toEqual([]);
    expect(result.base_html_updated).toBe(false);
  });

  test("refreshBaseHtml is idempotent", () => {
    expect(refreshBaseHtml(relicDir)).toBe(true);
    expect(refreshBaseHtml(relicDir)).toBe(false);
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
      // spec 012: fragments carry no chrome and no embedded sources —
      // the viewer server reads markdown live from disk
      expect(html.trim().startsWith("<relic-body>")).toBe(true);
      expect(html).toContain("<relic-spec-meta/>");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("relic-src-spec");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
