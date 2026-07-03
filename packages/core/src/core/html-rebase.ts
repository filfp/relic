/**
 * Extractor for pre-012 full-document spec HTML (the chrome-per-file era).
 * Retained solely for `relic viewer-migrate`, which lifts the authored
 * content region out of legacy documents into <relic-body> fragments.
 */

export interface SpecHtmlParts {
  specId: string;
  title: string;
  /** The full `<div id="relic-body">…</div>` block. */
  bodyBlock: string;
  srcSpec: string;
  srcPlan: string;
  srcTasks: string;
}

const CONTENT_REGION = /<!-- relic:content:start -->([\s\S]*?)<!-- relic:content:end -->/;
/** Legacy files (no sentinels): greedy to the last </div> that directly precedes a <script> or </body>. */
const LEGACY_BODY = /(<div id="relic-body">[\s\S]*<\/div>)\s*(?=<script|<\/body>)/;

function srcBlockRe(id: string): RegExp {
  return new RegExp(
    `(<script type="text/plain" id="${id}">)([\\s\\S]*?)(</script>)`
  );
}

export function extractSpecHtmlParts(html: string): SpecHtmlParts | null {
  let specId = html.match(/<span class="h-id">([^<]*)<\/span>/)?.[1]?.trim() ?? "";
  let title = html.match(/<span class="h-title">([^<]*)<\/span>/)?.[1]?.trim() ?? "";
  if (!specId || !title) {
    const tm = html.match(/<title>([^<]*?)\s+—\s+([^<]*)<\/title>/);
    if (tm) {
      specId = specId || (tm[1] ?? "").trim();
      title = title || (tm[2] ?? "").trim();
    }
  }
  if (!specId) return null;

  let bodyBlock: string | null = null;
  const sentinel = html.match(CONTENT_REGION);
  if (sentinel) {
    bodyBlock = (sentinel[1] ?? "").trim();
  } else {
    const legacy = html.match(LEGACY_BODY);
    if (legacy) bodyBlock = legacy[1] ?? null;
  }
  if (!bodyBlock || !bodyBlock.includes('<div id="relic-body">')) return null;

  const src = (id: string) => html.match(srcBlockRe(id))?.[2] ?? "";

  return {
    specId,
    title: title || specId,
    bodyBlock,
    srcSpec: src("relic-src-spec"),
    srcPlan: src("relic-src-plan"),
    srcTasks: src("relic-src-tasks"),
  };
}
