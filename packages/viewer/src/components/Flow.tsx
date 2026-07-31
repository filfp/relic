/** Mermaid-style flow diagram → SVG. Port of the retired base.html renderer. */

interface FlowNode {
  label: string;
  shape: "box" | "diamond" | "circle";
}
interface FlowEdge {
  from: string;
  to: string;
  label: string;
}

const EDGE =
  /^([A-Za-z0-9_]+)(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))?\s*-{2,}>?\s*(?:\|([^|]*)\|)?\s*([A-Za-z0-9_]+)(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))?\s*$/;
const NODE = /^([A-Za-z0-9_]+)(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))?$/;

function parseFlow(src: string) {
  const lines = src.split("\n").map((l) => l.trim()).filter(Boolean);
  let dir = "LR";
  const dm = lines[0]?.match(/^(?:graph|flowchart)\s+(LR|TD|RL|BT)/i);
  if (dm) dir = dm[1]!.toUpperCase();
  const bodyLines = dm ? lines.slice(1) : lines;

  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const addNode = (id: string, label?: string, shape?: FlowNode["shape"]) => {
    const existing = nodes.get(id);
    if (!existing) nodes.set(id, { label: label ?? id, shape: shape ?? "box" });
    else if (label) existing.label = label;
  };

  for (const line of bodyLines) {
    const em = line.match(EDGE);
    if (em) {
      const [, fId, fBox, fDiam, fCirc, label, tId, tBox, tDiam, tCirc] = em;
      addNode(fId!, fBox ?? fDiam ?? fCirc, fDiam ? "diamond" : fCirc ? "circle" : "box");
      addNode(tId!, tBox ?? tDiam ?? tCirc, tDiam ? "diamond" : tCirc ? "circle" : "box");
      edges.push({ from: fId!, to: tId!, label: label ?? "" });
      continue;
    }
    const nm = line.match(NODE);
    if (nm) addNode(nm[1]!, nm[2] ?? nm[3] ?? nm[4], nm[3] ? "diamond" : nm[4] ? "circle" : "box");
  }

  if (!nodes.size) {
    const steps = bodyLines
      .join(" ")
      .split(/\s*(?:-+>|→)\s*/)
      .map((step) => step.trim())
      .filter(Boolean);
    if (steps.length > 1) {
      steps.forEach((label, index) => addNode(`step_${index}`, label));
      for (let index = 1; index < steps.length; index += 1) {
        edges.push({
          from: `step_${index - 1}`,
          to: `step_${index}`,
          label: "",
        });
      }
    }
  }
  return { dir, nodes, edges };
}

function rankNodes(nodes: Map<string, FlowNode>, edges: FlowEdge[]): Map<string, number> {
  const ids = [...nodes.keys()];
  const inDeg = new Map(ids.map((id) => [id, 0]));
  edges.forEach(({ to }) => inDeg.set(to, (inDeg.get(to) ?? 0) + 1));
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  edges.forEach(({ from, to }) => adj.get(from)?.push(to));
  const ranks = new Map<string, number>();
  const q = ids.filter((id) => (inDeg.get(id) ?? 0) === 0);
  q.forEach((id) => ranks.set(id, 0));
  const vis = new Set(q);
  while (q.length) {
    const cur = q.shift()!;
    adj.get(cur)?.forEach((next) => {
      if (!vis.has(next)) {
        vis.add(next);
        q.push(next);
      }
      ranks.set(next, Math.max(ranks.get(next) ?? 0, (ranks.get(cur) ?? 0) + 1));
    });
  }
  ids.forEach((id) => {
    if (!ranks.has(id)) ranks.set(id, 0);
  });
  return ranks;
}

export function Flow({ source }: { source: string }) {
  const src = source.trim();
  if (!src) return null;
  const { dir, nodes, edges } = parseFlow(src);
  if (!nodes.size) return <pre>{src}</pre>;

  const horiz = dir === "LR" || dir === "RL";
  const nodeW = 120, nodeH = 38;
  const rankGap = horiz ? 150 : 90;
  const nodeGap = horiz ? 72 : 136;
  const ranks = rankNodes(nodes, edges);
  const maxRank = Math.max(...ranks.values(), 0);
  const rankGroups = new Map<number, string[]>();
  nodes.forEach((_, id) => {
    const r = ranks.get(id) ?? 0;
    if (!rankGroups.has(r)) rankGroups.set(r, []);
    rankGroups.get(r)!.push(id);
  });
  const pos = new Map<string, { x: number; y: number }>();
  let svgW = 0, svgH = 0;
  rankGroups.forEach((ids, rank) => {
    ids.forEach((id, i) => {
      const displayRank = dir === "RL" || dir === "BT" ? maxRank - rank : rank;
      const x = horiz ? displayRank * rankGap + 24 : i * nodeGap + 24;
      const y = horiz ? i * nodeGap + 24 : displayRank * rankGap + 24;
      pos.set(id, { x, y });
      svgW = Math.max(svgW, x + nodeW + 40);
      svgH = Math.max(svgH, y + nodeH + 60);
    });
  });

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: 680, display: "block", overflow: "visible", margin: "0.5rem 0" }}>
      <defs>
        <marker id="rl-farr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" className="rl-arrow" />
        </marker>
      </defs>
      {edges.map(({ from, to, label }, i) => {
        const fp = pos.get(from);
        const tp = pos.get(to);
        if (!fp || !tp) return null;
        const x1 = fp.x + nodeW / 2, y1 = fp.y + nodeH / 2;
        const x2 = tp.x + nodeW / 2, y2 = tp.y + nodeH / 2;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="rl-edge" strokeWidth={1.5} markerEnd="url(#rl-farr)" />
            {label && (
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={10} fontFamily="system-ui" className="rl-t-muted">
                {label}
              </text>
            )}
          </g>
        );
      })}
      {[...nodes.entries()].map(([id, { label, shape }]) => {
        const p = pos.get(id);
        if (!p) return null;
        const { x, y } = p;
        const cx = x + nodeW / 2, cy = y + nodeH / 2;
        return (
          <g key={id}>
            {shape === "diamond" ? (
              <polygon points={`${cx},${y} ${x + nodeW - 2},${cy} ${cx},${y + nodeH} ${x + 2},${cy}`} className="rl-node-diamond" strokeWidth={1.5} />
            ) : shape === "circle" ? (
              <ellipse cx={cx} cy={cy} rx={nodeW / 2} ry={nodeH / 2} className="rl-node-circle" strokeWidth={1.5} />
            ) : (
              <rect x={x + 2} y={y} width={nodeW - 4} height={nodeH} rx={6} className="rl-node-box" strokeWidth={1.5} />
            )}
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontFamily="system-ui" className="rl-t-strong">
              {label.length > 18 ? label.slice(0, 16) + "…" : label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
