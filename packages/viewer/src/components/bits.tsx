import type { ReactNode } from "react";

const STATUS_TONE: Record<string, string> = {
  pending: "slate",
  "in-progress": "blue",
  done: "green",
  risk: "red",
  draft: "purple",
  implemented: "green",
  ready: "blue",
};

const CHIP_TONES = new Set(["blue", "green", "amber", "red", "purple"]);

export function Status({ value, children }: { value?: string; children?: ReactNode }) {
  const v = (value ?? "pending").toLowerCase();
  return <span className={`rl-badge tone-${STATUS_TONE[v] ?? "slate"}`}>{children ?? v}</span>;
}

export function Chip({ color, children }: { color?: string; children?: ReactNode }) {
  const tone = color && CHIP_TONES.has(color.toLowerCase()) ? color.toLowerCase() : "slate";
  return <span className={`rl-chip tone-${tone}`}>{children}</span>;
}

const CALLOUT_ICON: Record<string, string> = { info: "ℹ", warn: "⚠", risk: "✕", success: "✓" };

export function Callout({ type, children }: { type?: string; children?: ReactNode }) {
  const t = type && CALLOUT_ICON[type.toLowerCase()] ? type.toLowerCase() : "info";
  return (
    <div className={`rl-callout ${t}`}>
      <span className="ico">{CALLOUT_ICON[t]}</span>
      {children}
    </div>
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct === 100 ? "#22c55e" : pct >= 60 ? "#3b82f6" : pct >= 30 ? "#f59e0b" : "#ef4444";
  return (
    <div className="rl-progress">
      <div className="rl-track-label">
        <span>{label ?? ""}</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div className="rl-track">
        <div style={{ background: color, width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Section({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <section className="rl-card">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function InlineWarning({ message }: { message: string }) {
  return <span className="rl-warning">⚠ {message}</span>;
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** relic-table — headers/rows as JSON attrs. Cell content is plain text. */
export function DataTable({ attrs }: { attrs: Record<string, string> }) {
  const headers = parseJson<string[]>(attrs.headers, []);
  const rows = parseJson<unknown[][]>(attrs.rows, []);
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="rl-table">
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {(Array.isArray(row) ? row : [row]).map((cell, j) => (
                <td key={j}>{String(cell ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
