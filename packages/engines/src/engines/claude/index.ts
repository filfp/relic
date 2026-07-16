import { join } from "path";
import { ensureDir, fileExists, readJson, writeJson } from "@relic/utility";

/**
 * Claude engine — plugin era (spec 011).
 *
 * No command files are written into the project. The relic plugin carries the
 * commands and ambient skills; this engine's job is the per-project
 * installation: the committed .claude/settings.json gets the Bash(relic *)
 * permission, the relic marketplace, and the plugin enablement — everyone
 * opening the project gets the plugin activated.
 */

interface ClaudeSettings {
  permissions?: { allow?: string[] };
  extraKnownMarketplaces?: Record<string, { source: { source: string; repo: string } }>;
  enabledPlugins?: Record<string, boolean>;
  [key: string]: unknown;
}

export const RELIC_MARKETPLACE = { source: { source: "github", repo: "filfp/relic" } };
export const RELIC_PLUGIN_KEY = "relic@relic";

export function writeClaude(projectDir: string): void {
  ensureDir(join(projectDir, ".claude"));
  const settingsPath = join(projectDir, ".claude", "settings.json");
  let settings: ClaudeSettings = {};
  if (fileExists(settingsPath)) {
    try {
      settings = readJson<ClaudeSettings>(settingsPath);
    } catch {
      // never overwrite a file we could not parse
      throw new Error(
        ".claude/settings.json exists but is not valid JSON — fix it and re-run"
      );
    }
  }

  if (typeof settings.permissions !== "object" || settings.permissions === null || Array.isArray(settings.permissions)) {
    settings.permissions = {};
  }
  const allow = settings.permissions.allow;
  settings.permissions.allow = Array.isArray(allow) ? allow : typeof allow === "string" ? [allow] : [];
  if (!settings.permissions.allow.includes("Bash(relic *)")) {
    settings.permissions.allow.push("Bash(relic *)");
  }

  settings.extraKnownMarketplaces ??= {};
  settings.extraKnownMarketplaces["relic"] = RELIC_MARKETPLACE;

  settings.enabledPlugins ??= {};
  settings.enabledPlugins[RELIC_PLUGIN_KEY] = true;

  writeJson(settingsPath, settings);

  console.log("Added Claude engine hooks (plugin era):");
  console.log("  .claude/settings.json  (Bash(relic *) allow rule)");
  console.log("  .claude/settings.json  (relic marketplace + plugin enabled for this project)");
  console.log("");
  console.log("Relic ships as a Claude Code plugin — commands and ambient skills load");
  console.log("automatically when the project is opened. Manual install if needed:");
  console.log("  /plugin marketplace add filfp/relic");
  console.log("  /plugin install relic@relic");
  console.log("Then run /relic:setup inside Claude Code to finish onboarding.");
}
