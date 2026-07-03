import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchFix } from "../api";
import type { FixDetail } from "../api";
import { Callout, InlineWarning } from "../components/bits";
import { Fragment } from "../components/Fragment";
import { Markdown } from "../components/Markdown";

export function FixPage() {
  const { id = "" } = useParams();
  const [fix, setFix] = useState<FixDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFix(null);
    fetchFix(id).then(setFix).catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <Callout type="risk">Failed to load fix {id}: {error}</Callout>;
  if (!fix) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1 className="rl-page-title">{fix.id}</h1>
      {fix.lints.map((l, i) => (
        <InlineWarning key={i} message={`${l.level}: ${l.message}`} />
      ))}
      {fix.fragment && <Fragment nodes={fix.fragment} derived={null} />}
      {fix.markdown && <div className="rl-card"><Markdown source={fix.markdown} /></div>}
    </>
  );
}
