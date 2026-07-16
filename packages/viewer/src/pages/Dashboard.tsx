import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProject } from "../api";
import type { ProjectInfo } from "../api";
import { Callout, Chip, Section } from "../components/bits";
import { SpecCard } from "../components/derived";

export function Dashboard() {
  const [info, setInfo] = useState<ProjectInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchProject().then(setInfo).catch((e) => setError(String(e)));
  }, []);

  if (error) return <Callout type="risk">Failed to load project: {error}</Callout>;
  if (!info) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1 className="rl-page-title">{info.project.name}</h1>
      <div className="row mb-2">
        <Chip>mode: {info.mode}</Chip>
        {info.validate.valid ? (
          <Chip color="green">validate: clean</Chip>
        ) : (
          <Chip color="red">validate: {info.validate.errors} error(s)</Chip>
        )}
        {info.validate.warnings > 0 && <Chip color="amber">{info.validate.warnings} warning(s)</Chip>}
      </div>

      <div className="grid-2">
        {info.specs.map((s) => (
          <SpecCard key={s.id} id={s.id} title={s.title} status={s.status} done={s.tasks.done} total={s.tasks.total} />
        ))}
      </div>

      {info.fixes.length > 0 && (
        <Section title="Fixes">
          <ul>
            {info.fixes.map((f) => (
              <li key={f.id}>
                <Link to={`/fix/${f.id}`}>{f.id}</Link> <Chip>{f.format}</Chip>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
