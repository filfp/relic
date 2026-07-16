export { runInit } from "./commands/init.ts";
export { runContext } from "./commands/context.ts";
export { runScaffold } from "./commands/scaffold.ts";
export { runValidate } from "./commands/validate.ts";
export { runSearch } from "./commands/search.ts";
export type { SearchResultEntry } from "./commands/search.ts";
export { runToonMigrate, buildSpecIndex, buildFixIndex, readManifestToon } from "./commands/toon-migrate.ts";
export type { MigrateResult, ManifestEntry } from "./commands/toon-migrate.ts";
export { runAddEngine, SUPPORTED_ENGINES } from "@relic/engines";
export type { Engine } from "@relic/engines";
export { runUse } from "./commands/use.ts";
export { runScan } from "./commands/scan.ts";
export { runSpecify } from "./commands/specify.ts";
export { runFix } from "./commands/fix.ts";
export { runClarify } from "./commands/clarify.ts";
export { runPlan } from "./commands/plan.ts";
export { runAnalyse } from "./commands/analyse.ts";
export { runTasks } from "./commands/tasks.ts";
export { runImplement } from "./commands/implement.ts";
export { runUpgrade } from "./commands/upgrade.ts";
export type { UpgradeOptions, UpgradeCheckResult, UpgradeResult } from "./commands/upgrade.ts";
export { runWrite } from "./commands/write.ts";
export type { WriteOptions, WriteResult, WriteTarget } from "./commands/write.ts";
export { runAsk } from "./commands/ask.ts";
export { runSnippet } from "./commands/snippet.ts";
export type { AskOptions } from "./commands/ask.ts";
export { runMode } from "./commands/mode.ts";
export type { ModeOptions } from "./commands/mode.ts";
export { runHtmlSync } from "./commands/html-sync.ts";
export { runViewerMigrate, migrateProject } from "./commands/viewer-migrate.ts";
export type { MigrateOptions, MigrateReport } from "./commands/viewer-migrate.ts";
export { runExternal } from "./commands/external.ts";
export { runServe, createViewerServer, healthyInstance } from "./commands/serve.ts";
export type { ServeOptions } from "./commands/serve.ts";
export { runMcp } from "./commands/mcp.ts";
export { parseFragment, lintFragment } from "./core/fragment.ts";
export type { FragmentNode, FragmentLint, ParsedFragment } from "./core/fragment.ts";
export { projectInfo, specDetail, fixDetail } from "./core/view-data.ts";
export type { ExternalOptions } from "./commands/external.ts";
export type { HtmlSyncOptions } from "./commands/html-sync.ts";
export { extractSpecHtmlParts } from "./core/html-rebase.ts";
export type { SpecHtmlParts } from "./core/html-rebase.ts";
export { loadRegistry, buildOwnershipMap } from "./core/artifact-registry.ts";
export { detectIntersections, formatIntersectionReport } from "./core/intersection.ts";
export { appendChangelog, filterChangelog, appendChangelogEntry } from "./core/changelog.ts";
export { buildContext, renderContext } from "./core/context-builder.ts";

export { findRelicDir } from "@relic/utility";
export { nextSpecId, slugify, inferSpecFromBranch, availableSpecs } from "@relic/utility";

export type {
  ArtifactsJson,
  SpecMeta,
  OwnershipConflict,
  FileOverlapWarning,
  IntersectionReport,
  BuiltContext,
  WritePayload,
} from "./types.ts";

export type { ChangelogEntry } from "./core/changelog.ts";
