import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";
import { parseDocument } from "yaml";

import type {
  FederationConfiguration,
  FederationMemberDeclaration,
  KnowledgeDiagnostic,
  KnowledgeTopology,
  RelicProjectConfiguration,
} from "./types.ts";

const LOCAL_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const RESERVED_RECORD_KINDS = new Set(["spec", "shared"]);
const RESERVED_FEDERATION_KEYS = new Set(["root"]);

export interface RelicProjectConfigurationRead {
  projectRoot?: string;
  configuration?: RelicProjectConfiguration;
  diagnostics: KnowledgeDiagnostic[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isInside(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}${sep}`);
}

function normalizeRelativePath(value: string): string {
  const normalized = value.replace(/^\.\//, "").replace(/\/+$/, "");
  return normalized === "" ? "." : normalized;
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
  const records: Record<string, string> = {};
  for (const [kind, value] of Object.entries(raw.records)) {
    if (RESERVED_RECORD_KINDS.has(kind)) {
      diagnostics.push({
        code: "invalid-record-kind",
        severity: "error",
        message: `topology.records key "${kind}" is reserved; use a project-defined record prefix`,
        path: "relic.yaml",
      });
      continue;
    }
    if (!LOCAL_KEY_PATTERN.test(kind)) {
      diagnostics.push({
        code: "invalid-record-kind",
        severity: "error",
        message: `topology.records key "${kind}" must start with a lowercase letter and contain only lowercase letters, digits, and single hyphens between segments`,
        path: "relic.yaml",
      });
      continue;
    }
    const path = validateTopologyPath(
      value,
      `records.${kind}`,
      projectRoot,
      diagnostics,
    );
    if (path) records[kind] = path;
  }
  if (!specs || !shared) return undefined;
  return { specs, shared, records };
}

function invalidFederationMember(
  diagnostics: KnowledgeDiagnostic[],
  key: string,
  message: string,
  code = "invalid-federation-member",
): null {
  diagnostics.push({
    code,
    severity: "error",
    message: `federation.members.${key} ${message}`,
    path: "relic.yaml",
  });
  return null;
}

function validateFederationMember(
  value: unknown,
  key: string,
  projectRoot: string,
  diagnostics: KnowledgeDiagnostic[],
): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return invalidFederationMember(
      diagnostics,
      key,
      "must be a non-empty project-relative directory path",
      "invalid-federation-member-path",
    );
  }
  if (value.includes("\\") || isAbsolute(value)) {
    return invalidFederationMember(
      diagnostics,
      key,
      'must use "/" and be project-relative',
      "invalid-federation-member-path",
    );
  }

  const normalized = normalizeRelativePath(value);
  const requestedRoot = resolve(projectRoot, normalized);
  if (!isInside(projectRoot, requestedRoot)) {
    return invalidFederationMember(
      diagnostics,
      key,
      "escapes the declaring project boundary",
      "invalid-federation-member-path",
    );
  }

  let memberRoot: string;
  try {
    if (!statSync(requestedRoot).isDirectory()) {
      return invalidFederationMember(diagnostics, key, "must reference a directory");
    }
    memberRoot = realpathSync(requestedRoot);
  } catch {
    return invalidFederationMember(
      diagnostics,
      key,
      "references a missing or unreadable directory",
    );
  }
  if (!isInside(projectRoot, memberRoot)) {
    return invalidFederationMember(
      diagnostics,
      key,
      "resolves outside the declaring project boundary",
      "invalid-federation-member-path",
    );
  }
  if (memberRoot === projectRoot) {
    return invalidFederationMember(
      diagnostics,
      key,
      "cannot reference the declaring project itself",
    );
  }

  const memberRelicPath = resolve(requestedRoot, "relic.yaml");
  try {
    const relicStat = lstatSync(memberRelicPath);
    if (!relicStat.isFile() || relicStat.isSymbolicLink()) {
      return invalidFederationMember(
        diagnostics,
        key,
        "must contain a regular, non-symlinked relic.yaml",
      );
    }
    const memberRelicRealPath = realpathSync(memberRelicPath);
    if (!isInside(memberRoot, memberRelicRealPath)) {
      return invalidFederationMember(
        diagnostics,
        key,
        "contains a relic.yaml outside the member boundary",
        "invalid-federation-member-path",
      );
    }
  } catch {
    return invalidFederationMember(
      diagnostics,
      key,
      "must contain a regular, non-symlinked relic.yaml",
    );
  }

  return normalized;
}

function readFederation(
  metadata: Record<string, unknown>,
  projectRoot: string,
  diagnostics: KnowledgeDiagnostic[],
): FederationConfiguration | undefined {
  if (!("federation" in metadata)) return undefined;

  const raw = metadata.federation;
  if (!isRecord(raw) || !isRecord(raw.members)) {
    diagnostics.push({
      code: "invalid-federation",
      severity: "error",
      message: "federation must contain a members mapping",
      path: "relic.yaml",
    });
    return undefined;
  }

  const members: FederationMemberDeclaration[] = [];
  for (const [key, value] of Object.entries(raw.members)) {
    const memberDiagnostics: KnowledgeDiagnostic[] = [];
    const declaredPath = typeof value === "string" ? value : undefined;
    if (RESERVED_FEDERATION_KEYS.has(key)) {
      invalidFederationMember(
        memberDiagnostics,
        key,
        'uses the reserved key "root"',
        "invalid-federation-member-key",
      );
    } else if (!LOCAL_KEY_PATTERN.test(key)) {
      invalidFederationMember(
        memberDiagnostics,
        key,
        "must start with a lowercase letter and contain only lowercase letters, digits, and single hyphens between segments",
        "invalid-federation-member-key",
      );
    } else {
      const normalizedPath = validateFederationMember(
        value,
        key,
        projectRoot,
        memberDiagnostics,
      );
      members.push({
        key,
        ...(declaredPath !== undefined && { declaredPath }),
        ...(normalizedPath !== null && { normalizedPath }),
        diagnostics: memberDiagnostics,
      });
      diagnostics.push(...memberDiagnostics);
      continue;
    }
    members.push({
      key,
      ...(declaredPath !== undefined && { declaredPath }),
      diagnostics: memberDiagnostics,
    });
    diagnostics.push(...memberDiagnostics);
  }
  return { members };
}

export function parseRelicProjectConfiguration(
  source: string,
  projectRoot: string,
  diagnostics: KnowledgeDiagnostic[],
): RelicProjectConfiguration | undefined {
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
    const supportedKeys = new Set(["topology", "federation"]);
    const unknownKeys = Object.keys(value).filter((key) => !supportedKeys.has(key));
    if (unknownKeys.length > 0) {
      diagnostics.push({
        code: "invalid-relic-config",
        severity: "error",
        message: `relic.yaml supports only topology and federation; remove: ${unknownKeys.join(", ")}`,
        path: "relic.yaml",
      });
      return undefined;
    }
    const topology = readTopology(value, projectRoot, diagnostics);
    const federation = readFederation(value, projectRoot, diagnostics);
    return {
      ...(topology !== undefined && { topology }),
      ...(federation !== undefined && { federation }),
    };
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

export function readRelicProjectConfiguration(
  projectPath: string,
): RelicProjectConfigurationRead {
  const diagnostics: KnowledgeDiagnostic[] = [];
  let projectRoot: string;
  try {
    projectRoot = realpathSync(projectPath);
  } catch {
    return {
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
      projectRoot,
      diagnostics: [{
        code: "missing-relic-config",
        severity: "error",
        message: "Missing relic.yaml",
        path: "relic.yaml",
      }],
    };
  }

  try {
    const relicStat = lstatSync(relicPath);
    if (!relicStat.isFile() || relicStat.isSymbolicLink()) {
      return {
        projectRoot,
        diagnostics: [{
          code: "invalid-relic-config",
          severity: "error",
          message: "relic.yaml must be a project-local regular file",
          path: "relic.yaml",
        }],
      };
    }
  } catch {
    return {
      projectRoot,
      diagnostics: [{
        code: "invalid-relic-config",
        severity: "error",
        message: "relic.yaml must be a readable project-local regular file",
        path: "relic.yaml",
      }],
    };
  }

  let relicRealPath: string;
  try {
    relicRealPath = realpathSync(relicPath);
  } catch {
    return {
      projectRoot,
      diagnostics: [{
        code: "invalid-relic-config",
        severity: "error",
        message: "relic.yaml must be a readable project-local regular file",
        path: "relic.yaml",
      }],
    };
  }
  if (!isInside(projectRoot, relicRealPath)) {
    return {
      projectRoot,
      diagnostics: [{
        code: "path-escape",
        severity: "error",
        message: "Resolved path escapes the repository boundary",
        path: "relic.yaml",
      }],
    };
  }

  let source: string;
  try {
    source = readFileSync(relicRealPath, "utf8");
  } catch {
    return {
      projectRoot,
      diagnostics: [{
        code: "invalid-relic-config",
        severity: "error",
        message: "relic.yaml must be readable",
        path: "relic.yaml",
      }],
    };
  }
  const configuration = parseRelicProjectConfiguration(
    source,
    projectRoot,
    diagnostics,
  );
  return {
    projectRoot,
    ...(configuration !== undefined && { configuration }),
    diagnostics,
  };
}
