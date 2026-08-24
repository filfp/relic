export { parseFrontmatter } from "./frontmatter.ts";
export { parseMarkdown } from "./markdown.ts";
export { parseSpecHtml } from "./html.ts";
export {
  loadFederatedKnowledgeProject,
  resolveFederatedArtifactAuthority,
} from "./federation.ts";
export { loadKnowledgeProject } from "./read-model.ts";
export { searchFederatedKnowledge, searchKnowledge } from "./search.ts";
export {
  artifactView,
  documentView,
  federatedArtifactView,
  federatedDocumentView,
  federatedProjectView,
  federatedSearchView,
  projectView,
  searchView,
} from "./view.ts";

export type {
  CanonicalDocument,
  CorpusMembership,
  DiagnosticSeverity,
  DocumentFormat,
  FederatedArtifact,
  FederatedDocument,
  FederatedKnowledgeBacklink,
  FederatedKnowledgeDiagnostic,
  FederatedKnowledgeLink,
  FederatedKnowledgeProject,
  FederatedKnowledgeReference,
  FederatedKnowledgeSearchResult,
  FederationConfiguration,
  FederationEdge,
  FederationEdgeStatus,
  FederationMemberDeclaration,
  FederationProjectNode,
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
  ProjectAddress,
  RecordKind,
  RelicProjectConfiguration,
} from "./types.ts";
export type {
  FederatedCanonicalDocument,
  FederatedKnowledgeArtifact,
  FederatedKnowledgeArtifactSummary,
  FederatedKnowledgeArtifactView,
  FederatedKnowledgeDocumentSummary,
  FederatedKnowledgeDocumentView,
  FederatedKnowledgeProjectView,
  FederationProjectSummary,
  KnowledgeArtifactSummary,
  KnowledgeArtifactView,
  KnowledgeDocumentSummary,
  KnowledgeDocumentView,
  KnowledgeProjectView,
} from "./view.ts";
export type { FederatedArtifactAuthority } from "./federation.ts";
