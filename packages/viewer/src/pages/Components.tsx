import { Callout, Chip } from "../components/bits";
import { Chart } from "../components/Chart";
import { Flow } from "../components/Flow";

export function Components() {
  return (
    <>
      <div className="rl-page-heading">
        <div>
          <p className="rl-eyebrow">Semantic HTML reference</p>
          <h1 className="rl-page-title">Progressive components</h1>
        </div>
      </div>

      <section className="rl-section">
        <h2>Default vocabulary</h2>
        <p>
          Prefer semantic HTML: headings, sections, tables, lists, links, figures,
          details, blockquotes, code, and native progress. Relic components exist only
          where progressive enhancement materially improves the synthesis.
        </p>
      </section>

      <section className="rl-section">
        <h2>Callouts and chips</h2>
        <Callout type="warn">Known kinds receive a tone; unknown kinds remain readable and neutral.</Callout>
        <p><Chip color="blue">neutral marker</Chip></p>
      </section>

      <section className="rl-section">
        <h2>Flow</h2>
        <Flow source={"graph LR\nIdea --> Decision\nDecision --> Evidence"} />
        <pre>{`<relic-flow>
graph LR
Idea --> Decision
Decision --> Evidence
</relic-flow>`}</pre>
      </section>

      <section className="rl-section">
        <h2>Chart backed by semantic data</h2>
        <Chart type="bar" title="Knowledge by type" labels={["Specs", "Records", "Shared"]} values={[4, 9, 6]} />
        <p>
          Canonical documents keep these values in a child table or list. Chart
          attributes may guide presentation but are never the only copy of knowledge.
        </p>
      </section>
    </>
  );
}
