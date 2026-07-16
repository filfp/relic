import { describe, test, expect } from "bun:test";
import { parseTaskPhases } from "../core/view-data.ts";

describe("parseTaskPhases", () => {
  const md = "### Phase 1\n- [ ] Task 1\n- [x] **T2** Task 2\n";

  test("parses phase titles and task counts", () => {
    const r = parseTaskPhases(md);
    expect(r.total).toBe(2);
    expect(r.done).toBe(1);
    expect(r.phases).toHaveLength(1);
    expect(r.phases[0]!.title).toBe("Phase 1");
    expect(r.phases[0]!.items.map((i) => i.done)).toEqual([false, true]);
  });

  test("CRLF line endings parse identically to LF", () => {
    const crlf = md.replace(/\n/g, "\r\n");
    expect(parseTaskPhases(crlf)).toEqual(parseTaskPhases(md));
  });
});
