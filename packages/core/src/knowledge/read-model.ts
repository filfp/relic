import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { parseDocument } from "yaml";

import { parseSpecHtml } from "./html.ts";
import { parseMarkdown } from "./markdown.ts";
import type {
  CanonicalDocument,
  CorpusMembership,
  DocumentFormat,
  KnowledgeArtifact,
  KnowledgeDiagnostic,
  KnowledgeLink,
  KnowledgeProject,
  KnowledgeTopology,
} from "./types.ts";

const MEMBERSHIP_ORDER: CorpusMembership[] = [
  "spec",
  "shared",
  "fr",
  "nfr",
  "adr",
  "epic",
];

const TEXT_ARTIFACT_EXTENSIONS = new Set([
  ".css",
  ".csv",
  ".graphql",
  ".htm",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".jsx",
  ".log",
  ".md",
  ".mjs",
  ".properties",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

const MAX_TEXT_ARTIFACT_BYTES = 2 * 1024 * 1024;

interface Candidate {
  realPath: string;
  path: string;
  formats: Set<DocumentFormat>;
  memberships: Set<CorpusMembership>;
}

interface ArtifactCandidate {
  realPath: string;
  path: string;
  specificationPaths: Set<string>;
  diagnostics: KnowledgeDiagnostic[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function repoPath(projectRoot: string, absolutePath: string): string {
  return relative(projectRoot, absolutePath).split(sep).join("/");
}

function isInside(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}${sep}`);
}

function resolveExistingInside(
  projectRoot: string,
  target: string,
  diagnostics: KnowledgeDiagnostic[],
  diagnosticPath: string,
): string | null {
  try {
    const real = realpathSync(target);
    if (!isInside(projectRoot, real)) {
      diagnostics.push({
        code: "path-escape",
        severity: "error",
        message: "Resolved path escapes the repository boundary",
        path: diagnosticPath,
      });
      return null;
    }
    return real;
  } catch {
    return null;
  }
}

function validateTopologyPath(
  value: unknown,
  key: string,
  projectRoot: string,
  diagnostics: KnowledgeDiagnostic[],
): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    diagnostics.push({
      code: "invalid-topology",
      severity: "error",
      message: `topology.${key} must be a non-empty repository-relative path`,
      path: "relic.yaml",
    });
    return null;
  }
  if (value.includes("\\") || isAbsolute(value)) {
    diagnostics.push({
      code: "invalid-topology-path",
      severity: "error",
      message: `topology.${key} must use "/" and be repository-relative`,
      path: "relic.yaml",
    });
    return null;
  }
  const absolute = resolve(projectRoot, value);
  if (!isInside(projectRoot, absolute)) {
    diagnostics.push({
      code: "invalid-topology-path",
      severity: "error",
      message: `topology.${key} escapes the repository boundary`,
      path: "relic.yaml",
    });
    return null;
  }
  return value.replace(/^\.\//, "").replace(/\/+$/, "");
}

function readTopology(
  metadata: Record<string, unknown>,
  projectRoot: string,
  diagnostics: KnowledgeDiagnostic[],
): KnowledgeTopology | undefined {
  const raw = metadata.topology;
  if (!isRecord(raw) || !isRecord(raw.records)) {
    diagnostics.push({
      code: "invalid-topology",
      severity: "error",
      message: "relic.yaml requires topology with specs, shared, and records",
      path: "relic.yaml",
    });
    return undefined;
  }

  const specs = validateTopologyPath(raw.specs, "specs", projectRoot, diagnostics);
  const shared = validateTopologyPath(raw.shared, "shared", projectRoot, diagnostics);
  const fr = validateTopologyPath(raw.records.fr, "records.fr", projectRoot, diagnostics);
  const nfr = validateTopologyPath(raw.records.nfr, "records.nfr", projectRoot, diagnostics);
  const adr = validateTopologyPath(raw.records.adr, "records.adr", projectRoot, diagnostics);
  const epic = validateTopologyPath(raw.records.epic, "records.epic", projectRoot, diagnostics);
  if (!specs || !shared || !fr || !nfr || !adr || !epic) return undefined;
  return { specs, shared, records: { fr, nfr, adr, epic } };
}

function parseTopologyFile(
  source: string,
  projectRoot: string,
  diagnostics: KnowledgeDiagnostic[],
): KnowledgeTopology | undefined {
  const document = parseDocument(source.replace(/^\uFEFF/, ""), {
    prettyErrors: true,
    strict: true,
    version: "1.2",
  });
  diagnostics.push(
    ...document.errors.map((error) => ({
      code: "invalid-relic-yaml",
      severity: "error" as const,
      message: error.message,
      path: "relic.yaml",
    })),
    ...document.warnings.map((warning) => ({
      code: "relic-yaml-warning",
      severity: "warning" as const,
      message: warning.message,
      path: "relic.yaml",
    })),
  );
  if (document.errors.length > 0) return undefined;

  try {
    const value = document.toJS({ maxAliasCount: 0 });
    if (!isRecord(value)) {
      diagnostics.push({
        code: "invalid-relic-config",
        severity: "error",
        message: "relic.yaml must contain a YAML mapping with topology",
        path: "relic.yaml",
      });
      return undefined;
    }
    const unknownKeys = Object.keys(value).filter((key) => key !== "topology");
    if (unknownKeys.length > 0) {
      diagnostics.push({
        code: "invalid-relic-config",
        severity: "error",
        message: `relic.yaml supports only topology; remove: ${unknownKeys.join(", ")}`,
        path: "relic.yaml",
      });
      return undefined;
    }
    return readTopology(value, projectRoot, diagnostics);
  } catch (error) {
    diagnostics.push({
      code: "unsafe-relic-yaml-alias",
      severity: "error",
      message: error instanceof Error ? error.message : "YAML aliases are not supported",
      path: "relic.yaml",
    });
    return undefined;
  }
}

function walkFiles(
  root: string,
  projectRoot: string,
  diagnostics: KnowledgeDiagnostic[],
): string[] {
  const files: string[] = [];
  const visitedDirectories = new Set<string>();

  const visit = (entryPath: string) => {
    const real = resolveExistingInside(
      projectRoot,
      entryPath,
      diagnostics,
      repoPath(projectRoot, entryPath),
    );
    if (!real) return;
    let stat;
    try {
      stat = statSync(real);
    } catch {
      return;
    }
    if (stat.isDirectory()) {
      if (visitedDirectories.has(real)) return;
      visitedDirectories.add(real);
      const entries = readdirSync(real).sort((a, b) => a.localeCompare(b));
      for (const entry of entries) visit(resolve(real, entry));
      return;
    }
    if (stat.isFile()) files.push(real);
  };

  visit(root);
  return [...new Set(files)].sort((a, b) => a.localeCompare(b));
}

function addCandidate(
  candidates: Map<string, Candidate>,
  realPath: string,
  projectRoot: string,
  format: DocumentFormat,
  membership: CorpusMembership,
): void {
  const existing = candidates.get(realPath);
  if (existing) {
    existing.formats.add(format);
    existing.memberships.add(membership);
    return;
  }
  candidates.set(realPath, {
    realPath,
    path: repoPath(projectRoot, realPath),
    formats: new Set([format]),
    memberships: new Set([membership]),
  });
}

function discoverMarkdownRoot(
  rootPath: string,
  membership: CorpusMembership,
  projectRoot: string,
  candidates: Map<string, Candidate>,
  diagnostics: KnowledgeDiagnostic[],
): void {
  const requested = resolve(projectRoot, rootPath);
  if (!existsSync(requested)) return;
  const realRoot = resolveExistingInside(projectRoot, requested, diagnostics, rootPath);
  if (!realRoot || !statSync(realRoot).isDirectory()) {
    diagnostics.push({
      code: "missing-corpus-root",
      severity: "warning",
      message: `Declared ${membership} root is missing or unreadable`,
      path: rootPath,
    });
    return;
  }
  for (const file of walkFiles(realRoot, projectRoot, diagnostics)) {
    if (extname(file).toLowerCase() === ".md") {
      addCandidate(candidates, file, projectRoot, "markdown", membership);
    }
  }
}

function discoverSpecs(
  rootPath: string,
  projectRoot: string,
  candidates: Map<string, Candidate>,
  artifactCandidates: Map<string, ArtifactCandidate>,
  diagnostics: KnowledgeDiagnostic[],
): void {
  const requested = resolve(projectRoot, rootPath);
  if (!existsSync(requested)) return;
  const realRoot = resolveExistingInside(projectRoot, requested, diagnostics, rootPath);
  if (!realRoot || !statSync(realRoot).isDirectory()) {
    diagnostics.push({
      code: "missing-corpus-root",
      severity: "warning",
      message: "Declared spec root is missing or unreadable",
      path: rootPath,
    });
    return;
  }

  const entries = readdirSync(realRoot).sort((a, b) => a.localeCompare(b));
  for (const entry of entries) {
    const requestedFolder = resolve(realRoot, entry);
    const folder = resolveExistingInside(
      projectRoot,
      requestedFolder,
      diagnostics,
      repoPath(projectRoot, requestedFolder),
    );
    if (!folder || !statSync(folder).isDirectory()) continue;

    const folderPath = repoPath(projectRoot, folder);
    const indexPath = resolve(folder, "index.html");
    const realIndex = existsSync(indexPath)
      ? resolveExistingInside(projectRoot, indexPath, diagnostics, repoPath(projectRoot, indexPath))
      : null;
    if (realIndex && statSync(realIndex).isFile()) {
      addCandidate(candidates, realIndex, projectRoot, "spec-html", "spec");
    } else {
      diagnostics.push({
        code: "missing-spec-index",
        severity: "warning",
        message: "Specification folder has no canonical index.html",
        path: folderPath,
      });
    }

    for (const file of walkFiles(folder, projectRoot, diagnostics)) {
      if (realIndex && file === realIndex) continue;
      const artifact = artifactCandidates.get(file);
      if (artifact) {
        artifact.specificationPaths.add(
          realIndex ? repoPath(projectRoot, realIndex) : folderPath,
        );
      } else {
        artifactCandidates.set(file, {
          realPath: file,
          path: repoPath(projectRoot, file),
          specificationPaths: new Set([
            realIndex ? repoPath(projectRoot, realIndex) : folderPath,
          ]),
          diagnostics: [],
        });
      }
    }
  }
}

function sortedMemberships(values: Set<CorpusMembership>): CorpusMembership[] {
  return [...values].sort(
    (left, right) => MEMBERSHIP_ORDER.indexOf(left) - MEMBERSHIP_ORDER.indexOf(right),
  );
}

function expectedId(memberships: CorpusMembership[], id: string): boolean {
  const checks: Partial<Record<CorpusMembership, RegExp>> = {
    spec: /^\d{3,}-[a-z0-9][a-z0-9-]*$/i,
    shared: /^SHARED-[a-z0-9][a-z0-9-]*$/i,
    fr: /^FR-\d{3,}$/i,
    nfr: /^NFR-\d{3,}$/i,
    adr: /^ADR-\d{3,}$/i,
    epic: /^EPIC-\d{3,}$/i,
  };
  return memberships.some((membership) => checks[membership]?.test(id) === true);
}

function displayLabel(
  metadata: Record<string, unknown>,
  title: string | undefined,
  id: string | undefined,
  path: string,
): string {
  if (typeof metadata.title === "string" && metadata.title.trim() !== "") {
    return metadata.title.trim();
  }
  return title?.trim() || id || basename(path);
}

function readArtifact(candidate: ArtifactCandidate): KnowledgeArtifact {
  const diagnostics = [...candidate.diagnostics];
  const stat = statSync(candidate.realPath);
  const extension = extname(candidate.realPath).toLowerCase();
  if (!TEXT_ARTIFACT_EXTENSIONS.has(extension)) {
    return {
      path: candidate.path,
      specificationPaths: [...candidate.specificationPaths].sort(),
      mediaType: "binary",
      diagnostics,
    };
  }
  if (stat.size > MAX_TEXT_ARTIFACT_BYTES) {
    diagnostics.push({
      code: "artifact-too-large",
      severity: "warning",
      message: "Text artifact exceeds the search extraction limit",
      path: candidate.path,
    });
    return {
      path: candidate.path,
      specificationPaths: [...candidate.specificationPaths].sort(),
      mediaType: "text",
      diagnostics,
    };
  }
  const content = readFileSync(candidate.realPath);
  if (content.includes(0)) {
    return {
      path: candidate.path,
      specificationPaths: [...candidate.specificationPaths].sort(),
      mediaType: "binary",
      diagnostics,
    };
  }
  return {
    path: candidate.path,
    specificationPaths: [...candidate.specificationPaths].sort(),
    mediaType: "text",
    searchableText: content.toString("utf8"),
    diagnostics,
  };
}

function splitHref(href: string): { path: string; fragment?: string } {
  const hash = href.indexOf("#");
  const beforeHash = hash >= 0 ? href.slice(0, hash) : href;
  const fragment = hash >= 0 ? href.slice(hash + 1) : undefined;
  const query = beforeHash.indexOf("?");
  return {
    path: query >= 0 ? beforeHash.slice(0, query) : beforeHash,
    ...(fragment !== undefined && { fragment }),
  };
}

function resolveLink(
  sourcePath: string,
  sourceRealPath: string,
  href: string,
  text: string,
  projectRoot: string,
  canonicalByRealPath: Map<string, string>,
  artifactByRealPath: Map<string, string>,
): KnowledgeLink {
  if (/^https?:\/\//i.test(href)) {
    return { sourcePath, href, text, status: "external" };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("/")) {
    return { sourcePath, href, text, status: "unsafe" };
  }

  const parts = splitHref(href);
  if (parts.path === "") {
    return {
      sourcePath,
      href,
      text,
      status: "fragment",
      ...(parts.fragment !== undefined && { fragment: parts.fragment }),
    };
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(parts.path);
  } catch {
    return { sourcePath, href, text, status: "unsafe" };
  }
  const requested = resolve(dirname(sourceRealPath), decodedPath);
  if (!isInside(projectRoot, requested)) {
    return { sourcePath, href, text, status: "unsafe" };
  }
  if (!existsSync(requested)) {
    return {
      sourcePath,
      href,
      text,
      status: "missing",
      resolvedPath: repoPath(projectRoot, requested),
      ...(parts.fragment !== undefined && { fragment: parts.fragment }),
    };
  }

  let real: string;
  try {
    real = realpathSync(requested);
  } catch {
    return { sourcePath, href, text, status: "missing" };
  }
  if (!isInside(projectRoot, real)) {
    return { sourcePath, href, text, status: "unsafe" };
  }

  const resolvedPath = repoPath(projectRoot, real);
  const canonical = canonicalByRealPath.get(real);
  if (canonical) {
    if (canonical === sourcePath) {
      return {
        sourcePath,
        href,
        text,
        status: "fragment",
        resolvedPath,
        ...(parts.fragment !== undefined && { fragment: parts.fragment }),
      };
    }
    return {
      sourcePath,
      href,
      text,
      status: "canonical",
      resolvedPath,
      targetPath: canonical,
      ...(parts.fragment !== undefined && { fragment: parts.fragment }),
    };
  }
  const artifact = artifactByRealPath.get(real);
  return {
    sourcePath,
    href,
    text,
    status: artifact ? "artifact" : "project-file",
    resolvedPath,
    ...(parts.fragment !== undefined && { fragment: parts.fragment }),
  };
}

export function loadKnowledgeProject(projectPath: string): KnowledgeProject {
  const diagnostics: KnowledgeDiagnostic[] = [];
  let projectRoot: string;
  try {
    projectRoot = realpathSync(projectPath);
  } catch {
    return {
      documents: [],
      artifacts: [],
      diagnostics: [{
        code: "missing-project-root",
        severity: "error",
        message: "Project root does not exist",
        path: projectPath,
      }],
    };
  }

  const relicPath = resolve(projectRoot, "relic.yaml");
  if (!existsSync(relicPath)) {
    return {
      documents: [],
      artifacts: [],
      diagnostics: [{
        code: "missing-relic-config",
        severity: "error",
        message: "Missing relic.yaml",
        path: "relic.yaml",
      }],
    };
  }

  const relicStat = lstatSync(relicPath);
  if (!relicStat.isFile() || relicStat.isSymbolicLink()) {
    return {
      documents: [],
      artifacts: [],
      diagnostics: [{
        code: "invalid-relic-config",
        severity: "error",
        message: "relic.yaml must be a project-local regular file",
        path: "relic.yaml",
      }],
    };
  }

  const relicRealPath = resolveExistingInside(
    projectRoot,
    relicPath,
    diagnostics,
    "relic.yaml",
  );
  if (!relicRealPath) {
    return { documents: [], artifacts: [], diagnostics };
  }

  const relicSource = readFileSync(relicRealPath, "utf8");
  const topology = parseTopologyFile(relicSource, projectRoot, diagnostics);

  const candidates = new Map<string, Candidate>();
  const artifactCandidates = new Map<string, ArtifactCandidate>();

  if (topology) {
    discoverSpecs(topology.specs, projectRoot, candidates, artifactCandidates, diagnostics);
    discoverMarkdownRoot(topology.shared, "shared", projectRoot, candidates, diagnostics);
    discoverMarkdownRoot(topology.records.fr, "fr", projectRoot, candidates, diagnostics);
    discoverMarkdownRoot(topology.records.nfr, "nfr", projectRoot, candidates, diagnostics);
    discoverMarkdownRoot(topology.records.adr, "adr", projectRoot, candidates, diagnostics);
    discoverMarkdownRoot(topology.records.epic, "epic", projectRoot, candidates, diagnostics);
  }

  for (const realPath of candidates.keys()) artifactCandidates.delete(realPath);

  const parsedLinks = new Map<string, Array<{ href: string; text: string }>>();
  const documents: CanonicalDocument[] = [...candidates.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((candidate) => {
      const memberships = sortedMemberships(candidate.memberships);
      const source = readFileSync(candidate.realPath, "utf8");
      const documentDiagnostics: KnowledgeDiagnostic[] = [];
      if (candidate.formats.size > 1) {
        documentDiagnostics.push({
          code: "ambiguous-document-format",
          severity: "error",
          message: "Overlapping topology assigned multiple canonical grammars",
          path: candidate.path,
        });
      }
      const format = candidate.formats.has("spec-html") ? "spec-html" : "markdown";

      if (format === "spec-html") {
        const parsed = parseSpecHtml(source, candidate.path);
        documentDiagnostics.push(...parsed.diagnostics);
        const folderId = basename(dirname(candidate.path));
        if (parsed.id && folderId.toLowerCase() !== parsed.id.toLowerCase()) {
          documentDiagnostics.push({
            code: "spec-folder-id-mismatch",
            severity: "warning",
            message: `Spec folder "${folderId}" does not match relic-body id "${parsed.id}"`,
            path: candidate.path,
          });
        }
        if (parsed.id && !expectedId(memberships, parsed.id)) {
          documentDiagnostics.push({
            code: "invalid-document-id",
            severity: "warning",
            message: `ID "${parsed.id}" does not match its canonical corpus`,
            path: candidate.path,
          });
        }
        parsedLinks.set(candidate.path, parsed.links);
        return {
          path: candidate.path,
          format,
          memberships,
          ...(parsed.id !== undefined && { id: parsed.id }),
          ...(parsed.title !== undefined && { title: parsed.title }),
          label: displayLabel(parsed.metadata, parsed.title, parsed.id, candidate.path),
          metadata: parsed.metadata,
          source,
          searchableText: parsed.searchableText,
          htmlAst: parsed.ast,
          links: [],
          backlinks: [],
          diagnostics: documentDiagnostics,
        };
      }

      const parsed = parseMarkdown(source, candidate.path);
      documentDiagnostics.push(...parsed.diagnostics);
      const rawId = parsed.metadata.id;
      const id = typeof rawId === "string" && rawId.trim() !== "" ? rawId.trim() : undefined;
      if (!id) {
        documentDiagnostics.push({
          code: "missing-document-id",
          severity: "error",
          message: "Canonical Relic Markdown requires a non-empty frontmatter id",
          path: candidate.path,
        });
      } else if (!expectedId(memberships, id)) {
        documentDiagnostics.push({
          code: "invalid-document-id",
          severity: "warning",
          message: `ID "${id}" does not match its canonical corpus`,
          path: candidate.path,
        });
      }
      parsedLinks.set(candidate.path, parsed.links);
      return {
        path: candidate.path,
        format,
        memberships,
        ...(id !== undefined && { id }),
        ...(parsed.title !== undefined && { title: parsed.title }),
        label: displayLabel(parsed.metadata, parsed.title, id, candidate.path),
        metadata: parsed.metadata,
        source,
        searchableText: parsed.searchableText,
        markdownAst: parsed.ast,
        links: [],
        backlinks: [],
        diagnostics: documentDiagnostics,
      };
    });

  const artifacts = [...artifactCandidates.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(readArtifact);
  const canonicalByRealPath = new Map(
    [...candidates.values()].map((candidate) => [candidate.realPath, candidate.path]),
  );
  const artifactByRealPath = new Map(
    [...artifactCandidates.values()].map((candidate) => [candidate.realPath, candidate.path]),
  );
  const realByDocumentPath = new Map(
    [...candidates.values()].map((candidate) => [candidate.path, candidate.realPath]),
  );

  const documentByPath = new Map(documents.map((document) => [document.path, document]));
  for (const document of documents) {
    const sourceRealPath = realByDocumentPath.get(document.path)!;
    document.links = (parsedLinks.get(document.path) ?? []).map((link) =>
      resolveLink(
        document.path,
        sourceRealPath,
        link.href,
        link.text,
        projectRoot,
        canonicalByRealPath,
        artifactByRealPath,
      )
    );
    for (const link of document.links) {
      if (link.status === "missing" || link.status === "unsafe") {
        document.diagnostics.push({
          code: link.status === "missing" ? "broken-link" : "unsafe-link",
          severity: "warning",
          message: link.status === "missing"
            ? `Linked path does not exist: ${link.href}`
            : `Link is not a safe repository-relative or HTTP(S) reference: ${link.href}`,
          path: document.path,
          href: link.href,
        });
      }
    }
  }

  const backlinkKeys = new Set<string>();
  for (const source of documents) {
    for (const link of source.links) {
      if (link.status !== "canonical" || !link.targetPath) continue;
      const key = `${source.path}\0${link.targetPath}`;
      if (backlinkKeys.has(key)) continue;
      backlinkKeys.add(key);
      documentByPath.get(link.targetPath)?.backlinks.push({
        sourcePath: source.path,
        targetPath: link.targetPath,
        href: link.href,
        text: link.text,
        ...(link.fragment !== undefined && { fragment: link.fragment }),
      });
    }
  }

  const documentsById = new Map<string, CanonicalDocument[]>();
  for (const document of documents) {
    if (!document.id) continue;
    const key = document.id.toLowerCase();
    const group = documentsById.get(key) ?? [];
    group.push(document);
    documentsById.set(key, group);
  }
  for (const group of documentsById.values()) {
    if (group.length < 2) continue;
    for (const document of group) {
      document.diagnostics.push({
        code: "duplicate-document-id",
        severity: "warning",
        message: `ID "${document.id}" is also used by ${group
          .filter((candidate) => candidate !== document)
          .map((candidate) => candidate.path)
          .join(", ")}`,
        path: document.path,
      });
    }
  }

  for (const document of documents) {
    const hasCanonicalLink = document.links.some((link) => link.status === "canonical");
    if (!hasCanonicalLink && document.backlinks.length === 0) {
      document.diagnostics.push({
        code: "orphan-document",
        severity: "info",
        message: "Canonical document has no incoming or outgoing knowledge links",
        path: document.path,
      });
    }
  }

  diagnostics.push(
    ...documents.flatMap((document) => document.diagnostics),
    ...artifacts.flatMap((artifact) => artifact.diagnostics),
  );
  return { ...(topology !== undefined && { topology }), documents, artifacts, diagnostics };
}
