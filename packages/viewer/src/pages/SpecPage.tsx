import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchSpec } from "../api";
import type { SpecDetail } from "../api";
import { Callout, InlineWarning } from "../components/bits";
import { Fragment } from "../components/Fragment";
import { Markdown } from "../components/Markdown";

type Tab = "view" | "spec" | "plan" | "tasks";

export function SpecPage() {
  const { id = "" } = useParams();
  const [spec, setSpec] = useState<SpecDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("view");

  useEffect(() => {
    setSpec(null);
    setTab("view");
    fetchSpec(id).then(setSpec).catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <Callout type="risk">Failed to load spec {id}: {error}</Callout>;
  if (!spec) return <p className="muted">Loading…</p>;

  const tabs: Array<[Tab, string, boolean]> = [
    ["view", "view", true],
    ["spec", "spec.md", spec.files.spec !== null],
    ["plan", "plan.md", spec.files.plan !== null],
    ["tasks", "tasks.md", spec.files.tasks !== null],
  ];

  return (
    <>
      <h1 className="rl-page-title">{spec.title}</h1>
      <div className="rl-tabs">
        {tabs.filter(([, , enabled]) => enabled).map(([key, label]) => (
          <button key={key} className={`rl-btn${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "view" && (
        <>
          {spec.lints.map((l, i) => (
            <InlineWarning key={i} message={`${l.level}: ${l.message}`} />
          ))}
          <Fragment nodes={spec.fragment} derived={spec.derived} />
        </>
      )}
      {tab === "spec" && spec.files.spec && <div className="rl-card"><Markdown source={spec.files.spec} /></div>}
      {tab === "plan" && spec.files.plan && <div className="rl-card"><Markdown source={spec.files.plan} /></div>}
      {tab === "tasks" && spec.files.tasks && <div className="rl-card"><Markdown source={spec.files.tasks} /></div>}
    </>
  );
}
