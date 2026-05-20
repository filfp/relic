import { join } from "path";
import { findRelicDir, fileExists, writeText, readMode, writeMode } from "@relic/utility";
import { TEMPLATES } from "../generated/templates.ts";

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

  // When switching to html, scaffold base.html if absent
  if (mode === "html") {
    const baseHtmlPath = join(relicDir, "base.html");
    if (!fileExists(baseHtmlPath)) {
      const template = TEMPLATES["base.html"] ?? "";
      writeText(baseHtmlPath, template);
      if (options.text) {
        console.log(`Mode set to html.`);
        console.log(`Created .relic/base.html (component library).`);
      } else {
        console.log(
          JSON.stringify({ mode, base_html_created: true }, null, 2)
        );
      }
      return;
    }
  }

  if (options.text) {
    console.log(`Mode set to ${mode}.`);
  } else {
    console.log(JSON.stringify({ mode, base_html_created: false }, null, 2));
  }
}
