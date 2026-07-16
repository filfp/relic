import { describe, test, expect } from "bun:test";
import { parseFragment, lintFragment } from "../core/fragment.ts";

const wrap = (inner: string) => `<relic-body>\n${inner}\n</relic-body>\n`;

describe("parseFragment", () => {
  test("parses a well-formed fragment into a node tree", () => {
    const r = parseFragment(wrap(`
      <relic-spec-meta/>
      <relic-section title="Overview">
        <p>Hello <strong>world</strong></p>
        <relic-callout type="info">Note</relic-callout>
      </relic-section>
      <relic-tasks/>
    `));
    expect(r.legacy).toBe(false);
    expect(r.lints).toEqual([]);
    const els = r.body.filter((n) => n.kind === "element");
    expect(els.map((e: any) => e.tag)).toEqual(["relic-spec-meta", "relic-section", "relic-tasks"]);
    const section: any = els[1];
    expect(section.attrs.title).toBe("Overview");
    const callout = section.children.find((n: any) => n.tag === "relic-callout");
    expect(callout.attrs.type).toBe("info");
  });

  test("relic-flow content is raw text (arrows never parsed as markup)", () => {
    const r = parseFragment(wrap(`<relic-flow>graph LR\nA[x] --> B{y?}\n</relic-flow>`));
    const flow: any = r.body.find((n: any) => n.tag === "relic-flow");
    expect(flow.children).toHaveLength(1);
    expect(flow.children[0].text).toContain("A[x] --> B{y?}");
    expect(r.lints).toEqual([]);
  });

  test("derived tags are self-closing even without a slash", () => {
    const r = parseFragment(wrap(`<relic-artifacts><p>after</p>`));
    const tags = r.body.filter((n) => n.kind === "element").map((e: any) => e.tag);
    expect(tags).toEqual(["relic-artifacts", "p"]);
  });

  test("unclosed attribute quote degrades to the intended value", () => {
    const r = parseFragment(wrap(`<relic-section title="unclosed>\n<p>hi</p>\n</relic-section>`));
    const section: any = r.body.find((n: any) => n.kind === "element" && n.tag === "relic-section");
    expect(section.attrs.title).toBe("unclosed");
  });

  test("unknown tag degrades to an element with a warning, page keeps parsing", () => {
    const r = parseFragment(wrap(`<relic-tabel headers='["A"]'>x</relic-tabel><p>ok</p>`));
    const bad: any = r.body.find((n: any) => n.tag === "relic-tabel");
    expect(bad.warnings[0]).toContain("unknown tag");
    expect(r.body.some((n: any) => n.tag === "p")).toBe(true);
    expect(r.lints.some((l) => l.level === "warning" && l.message.includes("relic-tabel"))).toBe(true);
    expect(r.lints.some((l) => l.level === "error")).toBe(false);
  });

  test("malformed JSON attr is a node warning + lint, not a failure", () => {
    const r = parseFragment(wrap(`<relic-table headers='["A",]' rows='[[1]]'></relic-table>`));
    const t: any = r.body.find((n: any) => n.tag === "relic-table");
    expect(t.warnings[0]).toContain("headers");
    expect(r.lints).toHaveLength(1);
  });

  test("unclosed tags auto-close with lints; never throws", () => {
    const r = parseFragment(wrap(`<relic-section title="A"><p>text`));
    const section: any = r.body.find((n: any) => n.tag === "relic-section");
    expect(section.children.some((n: any) => n.tag === "p")).toBe(true);
    expect(r.lints.some((l) => l.message.includes("auto-closed"))).toBe(true);
  });

  test("legacy full document is detected as an error", () => {
    const r = parseFragment(`<!DOCTYPE html>\n<html><head></head><body>old</body></html>`);
    expect(r.legacy).toBe(true);
    expect(r.lints[0]!.level).toBe("error");
    expect(r.lints[0]!.message).toContain("viewer-migrate");
  });

  test("missing relic-body root is an error but content still parses", () => {
    const r = parseFragment(`<relic-section title="X"><p>y</p></relic-section>`);
    expect(r.lints.some((l) => l.level === "error" && l.message.includes("relic-body"))).toBe(true);
    expect(r.body.some((n: any) => n.tag === "relic-section")).toBe(true);
  });

  test("comments are ignored; empty input yields empty body + error lint", () => {
    expect(parseFragment(wrap(`<!-- note -->`)).lints).toEqual([]);
    const empty = parseFragment("");
    expect(empty.body).toEqual([]);
    expect(empty.lints.some((l) => l.level === "error")).toBe(true);
  });

  test("lintFragment is the lint-only view", () => {
    expect(lintFragment(wrap("<p>fine</p>"))).toEqual([]);
    expect(lintFragment("<script>x</script>")[0]!.level).toBe("error");
  });
});
