/**
 * Value-shape classification for project-owned metadata. Metadata stays opaque:
 * these helpers only distinguish JSON-compatible shapes and never assign meaning
 * to a key or value. Search and the viewer share this single rule.
 *
 * This module is dependency-free so browser code can import it through the
 * `@relic/core/metadata` subpath without bundling the filesystem-bound read model.
 */
export type MetadataScalar = string | number | boolean | null;

export function isMetadataScalar(value: unknown): value is MetadataScalar {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

export function isMetadataPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMetadataScalarArray(value: unknown[]): value is MetadataScalar[] {
  return value.every(isMetadataScalar);
}

/** The string form a metadata filter compares against. */
export function metadataScalarString(value: Exclude<MetadataScalar, null>): string {
  return String(value);
}
