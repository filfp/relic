import { Callout, Chip, Progress, Section, Status } from "../components/bits";
import { Flow } from "../components/Flow";

const EX = {
  flow: `graph LR\nA[authored tag] --> B{parses?}\nB -->|yes| C[component]\nB -->|no| D[inline warning]`,
};

export function Docs() {
  return (
    <>
      <h1 className="rl-page-title">Fragment reference</h1>
      <Section title="The format">
        <p>
          A spec/fix HTML file is one <code>{"<relic-body>"}</code> fragment of semantic tags — no chrome, no
          scripts, no styles. Unknown or malformed tags degrade to inline warnings; they never break the page.
        </p>
      </Section>

      <Section title="Derived tags (self-closing — the server computes the content)">
        <table className="rl-table">
          <thead><tr><th>Tag</th><th>Source</th></tr></thead>
          <tbody>
            <tr><td><code>{"<relic-spec-meta/>"}</code></td><td>spec.md header (id, title, status)</td></tr>
            <tr><td><code>{"<relic-tasks/>"}</code></td><td>tasks.md — per-phase progress, computed live</td></tr>
            <tr><td><code>{"<relic-artifacts/>"}</code></td><td>artifacts.json — owns/reads/external with existence</td></tr>
            <tr><td><code>{"<relic-changelog/>"}</code></td><td>changelog.md filtered to this spec</td></tr>
          </tbody>
        </table>
        <Callout type="info">Never author the data these tags render — write the bare tag; staleness becomes impossible.</Callout>
      </Section>

      <Section title="Authored tags (synthesis)">
        <p><code>{'<relic-status value="done">'}</code> → <Status value="done">done</Status>{"  "}
           <code>{'<relic-chip color="blue">'}</code> → <Chip color="blue">spec-012</Chip></p>
        <p><code>{'<relic-callout type="warn">'}</code>:</p>
        <Callout type="warn">Warning callout body</Callout>
        <p><code>{'<relic-progress value="7" max="12" label="...">'}</code>:</p>
        <Progress value={7} max={12} label="Example progress" />
        <p><code>{"<relic-flow>"}</code> (mermaid-style graph syntax):</p>
        <Flow source={EX.flow} />
        <p>
          Also: <code>{'<relic-section title="...">'}</code> (card container),{" "}
          <code>{'<relic-chart type="bar|pie|line" labels data title>'}</code>,{" "}
          <code>{"<relic-table headers rows>"}</code> (JSON attrs), and plain prose tags
          (<code>p, ul, ol, code, strong, h3…</code>) inside sections.
        </p>
      </Section>
    </>
  );
}
