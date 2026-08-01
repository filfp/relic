import type { ReactNode } from "react";

/** Longest single-line string still rendered as a chip instead of prose. */
const COMPACT_TEXT = 64;
/** Most compact values a collection may hold and still sit in the summary row. */
const COMPACT_ITEMS = 8;
/** Collections larger than this open on demand instead of dominating the page. */
const COLLAPSE_ITEMS = 8;
/** Guard against pathological nesting in project-owned metadata. */
const MAX_DEPTH = 6;

type Scalar = string | number | boolean | null;

function isScalar(value: unknown): value is Scalar {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCompactScalar(value: unknown): boolean {
  if (!isScalar(value)) return false;
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  return trimmed.length <= COMPACT_TEXT && !trimmed.includes("\n");
}

function entryCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (isPlainObject(value)) return Object.keys(value).length;
  return 0;
}

/** A value belongs in the summary row when it reads as one short fact. */
function isCompactEntry(value: unknown): boolean {
  if (isCompactScalar(value)) return true;
  if (Array.isArray(value)) {
    return value.length <= COMPACT_ITEMS && value.every(isCompactScalar);
  }
  return isPlainObject(value) && Object.keys(value).length === 0;
}

function ScalarValue({ value }: { value: Scalar }) {
  if (value === null) return <span className="rl-meta-empty">none</span>;
  if (typeof value !== "string") {
    return <span className="rl-meta-value">{String(value)}</span>;
  }
  const trimmed = value.trim();
  if (trimmed === "") return <span className="rl-meta-empty">none</span>;
  if (isCompactScalar(trimmed)) return <span className="rl-meta-value">{trimmed}</span>;
  return <p className="rl-meta-text">{trimmed}</p>;
}

function Value({ value, depth = 0 }: { value: unknown; depth?: number }): ReactNode {
  if (isScalar(value)) return <ScalarValue value={value} />;
  if (value === undefined) return <span className="rl-meta-empty">none</span>;
  if (depth >= MAX_DEPTH) {
    return <code className="rl-meta-text">{JSON.stringify(value)}</code>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="rl-meta-empty">empty</span>;
    if (value.every(isCompactScalar)) {
      return (
        <span className="rl-meta-chips">
          {value.map((item, index) => <ScalarValue key={index} value={item as Scalar} />)}
        </span>
      );
    }
    return (
      <ol className="rl-meta-list">
        {value.map((item, index) => (
          <li key={index}><Value value={item} depth={depth + 1} /></li>
        ))}
      </ol>
    );
  }

  if (!isPlainObject(value)) return <span className="rl-meta-empty">none</span>;
  const entries = Object.entries(value);
  if (entries.length === 0) return <span className="rl-meta-empty">empty</span>;
  return (
    <dl className="rl-meta-grid">
      {entries.map(([key, nested]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd><Value value={nested} depth={depth + 1} /></dd>
        </div>
      ))}
    </dl>
  );
}

function Block({ label, value }: { label: string; value: unknown }) {
  const count = entryCount(value);
  const body = <Value value={value} />;
  if (count > COLLAPSE_ITEMS) {
    return (
      <details className="rl-meta-block">
        <summary>
          <span className="rl-meta-label">{label}</span>
          <span className="rl-meta-count">{count}</span>
        </summary>
        {body}
      </details>
    );
  }
  return (
    <div className="rl-meta-block">
      <span className="rl-meta-label">{label}</span>
      {count > 0 && <span className="rl-meta-count">{count}</span>}
      {body}
    </div>
  );
}

/**
 * Metadata is project-owned and opaque to Relic, so keys keep their authored names and
 * every value is rendered by shape: short facts stay in the summary row, structured
 * values expand recursively below it.
 */
export function Metadata({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return null;

  const compact = entries.filter(([, value]) => isCompactEntry(value));
  const structured = entries.filter(([, value]) => !isCompactEntry(value));

  return (
    <>
      {compact.length > 0 && (
        <section className="rl-metadata">
          {compact.map(([key, value]) => (
            <span key={key}>
              <strong>{key}</strong>
              <Value value={value} />
            </span>
          ))}
        </section>
      )}
      {structured.length > 0 && (
        <section className="rl-metadata-blocks">
          {structured.map(([key, value]) => <Block key={key} label={key} value={value} />)}
        </section>
      )}
    </>
  );
}
