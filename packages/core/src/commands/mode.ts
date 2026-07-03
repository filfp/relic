import { findRelicDir, readMode, writeMode } from "@relic/utility";

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

  // spec 012: html mode needs no per-project chrome — the embedded viewer
  // (`relic serve`) renders <relic-body> fragments
  if (options.text) {
    console.log(`Mode set to ${mode}.`);
    if (mode === "html") console.log("Spec HTML files are fragments — view them with: relic serve");
  } else {
    console.log(JSON.stringify({ mode }, null, 2));
  }
}
