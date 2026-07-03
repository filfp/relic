import { Component, createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { DerivedData, FragmentNode } from "../api";
import { Callout, Chip, DataTable, InlineWarning, Progress, Section, Status } from "./bits";
import { Chart } from "./Chart";
import { Flow } from "./Flow";
import { SpecMetaView, TasksView, ArtifactsView, ChangelogView } from "./derived";

export const DerivedContext = createContext<DerivedData | null>(null);

class Boundary extends Component<{ tag: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (this.state.failed) return <InlineWarning message={`<${this.props.tag}> failed to render`} />;
    return this.props.children;
  }
}

const PROSE = new Set([
  "p", "ul", "ol", "li", "code", "pre", "strong", "em", "b", "i", "a",
  "br", "hr", "div", "span", "h3", "h4", "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
]);

function textOf(nodes: FragmentNode[]): string {
  return nodes.map((n) => (n.kind === "text" ? n.text : n.kind === "element" ? textOf(n.children) : "")).join("");
}

/** Minimal inline renderer for legacy table cells that carry tags as strings. */
export function InlineCell({ raw }: { raw: string }) {
  if (!raw.includes("<")) return <>{raw}</>;
  const parts: ReactNode[] = [];
  const re = /<(relic-chip|relic-status|code|strong|em)([^>]*)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  const strip = (s: string) => s.replace(/<[^>]+>/g, "");
  while ((m = re.exec(raw))) {
    if (m.index > last) parts.push(strip(raw.slice(last, m.index)));
    const [, tag, attrSrc, inner] = m;
    const attr = (name: string) => attrSrc!.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`))?.[1];
    const content = strip(inner!);
    if (tag === "relic-chip") parts.push(<Chip key={key++} color={attr("color")}>{content}</Chip>);
    else if (tag === "relic-status") parts.push(<Status key={key++} value={attr("value")}>{content}</Status>);
    else if (tag === "code") parts.push(<code key={key++}>{content}</code>);
    else if (tag === "strong") parts.push(<strong key={key++}>{content}</strong>);
    else parts.push(<em key={key++}>{content}</em>);
    last = m.index + m[0].length;
  }
  if (last < raw.length) parts.push(strip(raw.slice(last)));
  return <>{parts}</>;
}

function ElementNode({ node }: { node: Extract<FragmentNode, { kind: "element" }> }) {
  const derived = useContext(DerivedContext);
  const { tag, attrs, children, warnings } = node;
  const kids = <Nodes nodes={children} />;
  const warn = warnings?.map((w, i) => <InlineWarning key={`w${i}`} message={w} />);

  let rendered: ReactNode;
  switch (tag) {
    case "relic-section":
      rendered = <Section title={attrs.title}>{kids}</Section>;
      break;
    case "relic-callout":
      rendered = <Callout type={attrs.type}>{kids}</Callout>;
      break;
    case "relic-chip":
      rendered = <Chip color={attrs.color}>{textOf(children)}</Chip>;
      break;
    case "relic-status":
      rendered = <Status value={attrs.value}>{textOf(children) || undefined}</Status>;
      break;
    case "relic-progress":
      rendered = <Progress value={Number(attrs.value ?? 0)} max={Number(attrs.max ?? 100)} label={attrs.label} />;
      break;
    case "relic-flow":
      rendered = <Flow source={textOf(children)} />;
      break;
    case "relic-chart":
      rendered = <Chart attrs={attrs} />;
      break;
    case "relic-table":
      rendered = <FragmentTable attrs={attrs} />;
      break;
    case "relic-spec-meta":
      rendered = derived ? <SpecMetaView meta={derived.meta} /> : null;
      break;
    case "relic-tasks":
      rendered = derived ? <TasksView tasks={derived.tasks} /> : null;
      break;
    case "relic-artifacts":
      rendered = derived ? <ArtifactsView artifacts={derived.artifacts} externalReads={derived.external_reads} /> : null;
      break;
    case "relic-changelog":
      rendered = derived ? <ChangelogView entries={derived.changelog} /> : null;
      break;
    default:
      if (PROSE.has(tag)) {
        const Tag = tag as keyof HTMLElementTagNameMap;
        rendered =
          tag === "br" || tag === "hr" ? <Tag /> : tag === "a" ? <a href={attrs.href}>{kids}</a> : <Tag>{kids}</Tag>;
      } else {
        rendered = <InlineWarning message={`unknown tag <${tag}>`} />;
      }
  }

  return (
    <Boundary tag={tag}>
      {warn}
      {rendered}
    </Boundary>
  );
}

/** relic-table with inline-tag-aware cells (legacy content carries tags as strings). */
function FragmentTable({ attrs }: { attrs: Record<string, string> }) {
  let headers: string[] = [];
  let rows: unknown[][] = [];
  try { headers = JSON.parse(attrs.headers ?? "[]"); } catch { /* warned by parser */ }
  try { rows = JSON.parse(attrs.rows ?? "[]"); } catch { /* warned by parser */ }
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="rl-table">
        {headers.length > 0 && (
          <thead>
            <tr>{headers.map((h, i) => <th key={i}><InlineCell raw={String(h)} /></th>)}</tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {(Array.isArray(row) ? row : [row]).map((cell, j) => (
                <td key={j}><InlineCell raw={String(cell ?? "")} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Nodes({ nodes }: { nodes: FragmentNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.kind === "text") return n.text.trim() === "" ? null : <span key={i}>{n.text}</span>;
        if (n.kind === "warning") return <InlineWarning key={i} message={`${n.message}: ${n.raw.slice(0, 40)}`} />;
        return <ElementNode key={i} node={n} />;
      })}
    </>
  );
}

export function Fragment({ nodes, derived }: { nodes: FragmentNode[]; derived: DerivedData | null }) {
  return (
    <DerivedContext.Provider value={derived}>
      <Nodes nodes={nodes} />
    </DerivedContext.Provider>
  );
}
