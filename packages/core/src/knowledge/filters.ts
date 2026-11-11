import {
  isMetadataScalar,
  isMetadataScalarArray,
  metadataScalarString,
} from "./metadata.ts";
import type { CanonicalDocument } from "./types.ts";

/** `key` alone is a presence filter; with `value` it is a literal scalar match. */
export interface MetadataFilter {
  key: string;
  value?: string;
}

export interface KnowledgeSearchFilters {
  /** Each kind must equal one of the document's memberships. */
  kinds?: readonly string[];
  /** Each filter must match the document's top-level metadata. */
  metadata?: readonly MetadataFilter[];
}

/** A malformed filter argument; an input error, never a knowledge diagnostic. */
export class SearchFilterInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchFilterInputError";
  }
}

export function hasStructuralFilters(filters: KnowledgeSearchFilters | undefined): boolean {
  return (filters?.kinds?.length ?? 0) > 0 || (filters?.metadata?.length ?? 0) > 0;
}

function presence(key: string): MetadataFilter {
  return { key };
}

function jsonEntryFilters(key: string, value: unknown): MetadataFilter[] {
  if (value === null) return [presence(key)];
  if (isMetadataScalar(value)) {
    return [{ key, value: metadataScalarString(value) }];
  }
  if (Array.isArray(value) && isMetadataScalarArray(value)) {
    return value.map((item) =>
      item === null ? presence(key) : { key, value: metadataScalarString(item) }
    );
  }
  throw new SearchFilterInputError(
    `Metadata filter "${key}" must be a scalar, null, or a list of scalars`,
  );
}

/**
 * Parse one `--meta` argument. A leading `{` selects the JSON object form; anything
 * else is `key` or `key=value` (split at the first `=`).
 */
export function parseMetadataFilter(argument: string): MetadataFilter[] {
  if (argument.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(argument);
    } catch (error) {
      throw new SearchFilterInputError(
        `Invalid JSON metadata filter: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new SearchFilterInputError("JSON metadata filter must be an object");
    }
    return Object.entries(parsed).flatMap(([key, value]) => jsonEntryFilters(key, value));
  }
  const separator = argument.indexOf("=");
  const key = separator < 0 ? argument : argument.slice(0, separator);
  if (key === "") {
    throw new SearchFilterInputError(`Metadata filter "${argument}" needs a key`);
  }
  return [separator < 0 ? presence(key) : { key, value: argument.slice(separator + 1) }];
}

function matchesMetadataFilter(
  metadata: Record<string, unknown>,
  filter: MetadataFilter,
): boolean {
  if (!Object.hasOwn(metadata, filter.key)) return false;
  if (filter.value === undefined) return true;
  const actual = metadata[filter.key];
  const matches = (candidate: unknown): boolean =>
    isMetadataScalar(candidate) && candidate !== null &&
    metadataScalarString(candidate) === filter.value;
  return Array.isArray(actual) ? actual.some(matches) : matches(actual);
}

export function matchesFilters(
  document: CanonicalDocument,
  filters: KnowledgeSearchFilters | undefined,
): boolean {
  return (filters?.kinds ?? []).every((kind) => document.memberships.includes(kind)) &&
    (filters?.metadata ?? []).every((filter) =>
      matchesMetadataFilter(document.metadata, filter)
    );
}

/** Version of the JSON search output. Additive fields keep it; removals or renames bump it. */
export const SEARCH_FORMAT_VERSION = 1;

/**
 * Build filters from raw `kind` values and `--meta` arguments (plain or JSON form).
 * Throws {@link SearchFilterInputError} on malformed input, before any search runs.
 */
export function buildSearchFilters(
  kinds: readonly string[] = [],
  meta: readonly string[] = [],
): KnowledgeSearchFilters {
  for (const kind of kinds) {
    if (kind.trim() === "") throw new SearchFilterInputError("Kind filter cannot be empty");
  }
  return { kinds: [...kinds], metadata: meta.flatMap(parseMetadataFilter) };
}
