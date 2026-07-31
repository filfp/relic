import type { ReactNode } from "react";

const CHIP_TONES = new Set(["blue", "green", "amber", "red", "purple"]);

export function Chip({ color, children }: { color?: string; children?: ReactNode }) {
  const tone = color && CHIP_TONES.has(color.toLowerCase()) ? color.toLowerCase() : "slate";
  return <span className={`rl-chip tone-${tone}`}>{children}</span>;
}

const CALLOUT_ICON: Record<string, string> = {
  info: "ℹ",
  neutral: "•",
  risk: "✕",
  success: "✓",
  warn: "⚠",
};

export function Callout({ type, children }: { type?: string; children?: ReactNode }) {
  const t = type && CALLOUT_ICON[type.toLowerCase()] ? type.toLowerCase() : "neutral";
  return (
    <div className={`rl-callout ${t}`}>
      <span className="ico">{CALLOUT_ICON[t]}</span>
      {children}
    </div>
  );
}
