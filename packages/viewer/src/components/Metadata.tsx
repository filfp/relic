import type { ReactNode } from "react";

import { Chip } from "./bits";

/** Prevent pathological project-owned input from exhausting the browser renderer. */
const MAX_RENDER_DEPTH = 12;

type Scalar = string | number | boolean | null;

function isScalar(value: unknown): value is Scalar {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalarArray(value: unknown[]): value is Scalar[] {
  return value.every(isScalar);
}

function ScalarValue({ value }: { value: Scalar }) {
  if (value === null) return <span className="rl-meta-empty">none</span>;
  if (typeof value !== "string") return <span className="rl-meta-value">{String(value)}</span>;
  if (value === "") return <span className="rl-meta-empty">empty string</span>;
  return <span className="rl-meta-value">{value}</span>;
}

function BoundedValue({ value }: { value: unknown }) {
  let formatted: string;
  try {
    formatted = JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    formatted = String(value);
  }

  return (
    <details className="rl-meta-overflow">
      <summary>Show deeply nested value</summary>
      <pre>{formatted}</pre>
    </details>
  );
}

function MetadataObject({
  value,
  depth,
}: {
  value: Record<string, unknown>;
  depth: number;
}) {
  const entries = Object.entries(value);
  if (entries.length === 0) return <span className="rl-meta-empty">empty object</span>;

  return (
    <dl className="rl-meta-object">
      {entries.map(([key, nested]) => (
        <div className="rl-meta-property" key={key}>
          <dt>{key}</dt>
          <dd><MetadataValue value={nested} depth={depth + 1} /></dd>
        </div>
      ))}
    </dl>
  );
}

function MetadataArray({ value, depth }: { value: unknown[]; depth: number }) {
  if (value.length === 0) return <span className="rl-meta-empty">empty list</span>;
  if (isScalarArray(value)) {
    return (
      <span className="rl-meta-chips">
        {value.map((item, index) => <Chip key={index}><ScalarValue value={item} /></Chip>)}
      </span>
    );
  }

  return (
    <ol className="rl-meta-collection">
      {value.map((item, index) => (
        <li key={index}><MetadataValue value={item} depth={depth + 1} /></li>
      ))}
    </ol>
  );
}

function MetadataValue({ value, depth }: { value: unknown; depth: number }): ReactNode {
  if (isScalar(value)) return <ScalarValue value={value} />;
  if (value === undefined) return <span className="rl-meta-empty">undefined</span>;
  if (depth >= MAX_RENDER_DEPTH) return <BoundedValue value={value} />;
  if (Array.isArray(value)) return <MetadataArray value={value} depth={depth} />;
  if (isPlainObject(value)) return <MetadataObject value={value} depth={depth} />;
  return <span className="rl-meta-value">{String(value)}</span>;
}

/**
 * Project metadata remains opaque: presentation follows JSON-compatible value shapes
 * recursively and never assigns meaning to project-defined keys.
 */
export function Metadata({ metadata }: { metadata: Record<string, unknown> }) {
  if (Object.keys(metadata).length === 0) return null;

  return (
    <section className="rl-metadata" aria-label="Document metadata">
      <MetadataObject value={metadata} depth={0} />
    </section>
  );
}
