export { parseFrontmatter } from "./frontmatter.ts";
export { parseMarkdown } from "./markdown.ts";
export { parseSpecHtml } from "./html.ts";
export {
  formatIdentityNumber,
  loadKnowledgeProject,
  nextIdentityNumber,
} from "./read-model.ts";
export { searchKnowledge } from "./search.ts";

export type {
  CanonicalDocument,
  CorpusMembership,
  DiagnosticSeverity,
  DocumentFormat,
  HtmlAstNode,
  KnowledgeArtifact,
  KnowledgeBacklink,
  KnowledgeDiagnostic,
  KnowledgeLink,
  KnowledgeProject,
  KnowledgeSearchResult,
  KnowledgeTopology,
  LinkStatus,
  MarkdownAstNode,
} from "./types.ts";
export type { NumberedIdentityKind } from "./read-model.ts";
