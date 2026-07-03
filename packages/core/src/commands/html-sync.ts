/**
 * relic html-sync — RETIRED (spec 012).
 *
 * There is no chrome in project HTML files any more: specs/fixes are
 * <relic-body> fragments and the embedded viewer (`relic serve`) renders
 * them. Legacy full-document files are converted by `relic viewer-migrate`.
 */

export interface HtmlSyncOptions {
  spec?: string;
  text?: boolean;
  relicDir?: string;
}

export async function runHtmlSync(_options: HtmlSyncOptions): Promise<void> {
  console.error(
    "relic html-sync is retired (spec 012): project HTML files are <relic-body> fragments\n" +
      "with no chrome to sync. Use:\n" +
      "  relic viewer-migrate   # convert pre-012 full-document HTML files\n" +
      "  relic serve            # view specs at http://localhost:<port>/"
  );
  process.exit(1);
}
