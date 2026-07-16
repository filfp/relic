import { useMemo } from "react";
import { markdownToHtml } from "../markdown";

export function Markdown({ source }: { source: string }) {
  const html = useMemo(() => markdownToHtml(source), [source]);
  return <div className="rl-md" dangerouslySetInnerHTML={{ __html: html }} />;
}
