import { findRelicDir, readMode, writeMode } from "@relic/utility";
import { refreshBaseHtml } from "./html-sync.ts";

export interface ModeOptions {
  value?: string;
  text?: boolean;
  relicDir?: string;
}

export async function runMode(options: ModeOptions): Promise<void> {
  const relicDir = options.relicDir ?? findRelicDir(process.cwd());
  if (!relicDir) {
    console.error("Error: not in a Relic project. Run: relic init");
    process.exit(1);
  }

  // No argument — read and print current mode
  if (options.value === undefined) {
    const current = readMode(relicDir);
    if (options.text) {
      console.log(`mode: ${current}`);
    } else {
      console.log(JSON.stringify({ mode: current }, null, 2));
    }
    return;
  }

  // Validate the value
  if (options.value !== "md" && options.value !== "html") {
    console.error(
      `Error: invalid mode "${options.value}". Valid values are: md, html`
    );
    process.exit(1);
  }

  const mode = options.value as "md" | "html";
  writeMode(relicDir, mode);

  // When switching to html, write base.html from the current template
  // (creates it if absent, refreshes it if stale)
  if (mode === "html") {
    const updated = refreshBaseHtml(relicDir);
    if (options.text) {
      console.log(`Mode set to html.`);
      if (updated) console.log(`Wrote .relic/base.html (component library).`);
    } else {
      console.log(JSON.stringify({ mode, base_html_updated: updated }, null, 2));
    }
    return;
  }

  if (options.text) {
    console.log(`Mode set to ${mode}.`);
  } else {
    console.log(JSON.stringify({ mode, base_html_updated: false }, null, 2));
  }
}
