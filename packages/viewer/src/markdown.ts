/**
 * Small GFM-ish markdown renderer (headings, lists incl. task lists, tables,
 * code fences, blockquotes, inline formatting). Ported from the retired
 * base.html reader — the viewer renders spec/plan/tasks live from disk.
 */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inl(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c: string) => `<code>${c}</code>`)
    .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text: string, url: string) => {
      const scheme = url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)?.[0].toLowerCase();
      const safe = scheme && !["http:", "https:", "mailto:"].includes(scheme) ? "#" : url;
      return `<a href="${safe.replace(/"/g, "&quot;")}">${text}</a>`;
    });
}

const LIST_RE = /^(\s*)([-*+]|\d+\.) (.*)$/;

function renderList(lines: string[]): string {
  const stack: Array<{ indent: number; tag: "ul" | "ol" }> = [];
  let html = "";
  for (const raw of lines) {
    const m = raw.match(LIST_RE)!;
    const indent = m[1]!.length;
    const tag: "ul" | "ol" = /^\d/.test(m[2]!) ? "ol" : "ul";
    while (stack.length && indent < stack[stack.length - 1]!.indent) {
      html += `</${stack.pop()!.tag}>`;
    }
    if (!stack.length || indent > stack[stack.length - 1]!.indent) {
      stack.push({ indent, tag });
      html += `<${tag}>`;
    }
    const tm = m[3]!.match(/^\[( |x|X)\] (.*)$/);
    if (tm) {
      const checked = tm[1]!.toLowerCase() === "x" ? " checked" : "";
      html += `<li class="task"><input type="checkbox" disabled${checked}> ${inl(tm[2]!)}</li>`;
    } else {
      html += `<li>${inl(m[3]!)}</li>`;
    }
  }
  while (stack.length) html += `</${stack.pop()!.tag}>`;
  return html;
}

export function markdownToHtml(src: string): string {
  const lines = src.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (/^```/.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!)) {
        code.push(esc(lines[i]!));
        i++;
      }
      out.push(`<pre><code>${code.join("\n")}</code></pre>`);
      i++;
      continue;
    }

    const hm = line.match(/^(#{1,4}) (.+)/);
    if (hm) {
      out.push(`<h${hm[1]!.length}>${inl(hm[2]!)}</h${hm[1]!.length}>`);
      i++;
      continue;
    }

    if (/^---+\s*$|^\*\*\*+\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (/^> ?/.test(line)) {
      const bq: string[] = [];
      while (i < lines.length && /^> ?/.test(lines[i]!)) {
        bq.push(lines[i]!.replace(/^> ?/, ""));
        i++;
      }
      out.push(`<blockquote>${markdownToHtml(bq.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^\|/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i]!)) {
        if (!/^\|[-|: ]+\|$/.test(lines[i]!)) {
          rows.push(lines[i]!.split("|").slice(1, -1).map((c) => c.trim()));
        }
        i++;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        out.push(
          `<table><thead><tr>${head!.map((c) => `<th>${inl(c)}</th>`).join("")}</tr></thead><tbody>${body
            .map((r) => `<tr>${r.map((c) => `<td>${inl(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        );
      }
      continue;
    }

    if (LIST_RE.test(line)) {
      const block: string[] = [];
      while (i < lines.length && LIST_RE.test(lines[i]!)) {
        block.push(lines[i]!);
        i++;
      }
      out.push(renderList(block));
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^[#>|`]/.test(lines[i]!) &&
      !LIST_RE.test(lines[i]!) &&
      !/^---+\s*$/.test(lines[i]!)
    ) {
      para.push(lines[i]!);
      i++;
    }
    if (para.length) out.push(`<p>${inl(para.join("\n")).replace(/\n/g, "<br>")}</p>`);
  }
  return out.join("\n");
}
