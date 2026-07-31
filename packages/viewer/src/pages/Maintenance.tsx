import { useEffect, useState } from "react";

import {
  documentRoute,
  fetchProject,
  type ProjectView,
} from "../api";
import { Callout, Chip } from "../components/bits";

export function Maintenance() {
  const [project, setProject] = useState<ProjectView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProject().then(setProject).catch((reason) => setError(String(reason)));
  }, []);

  if (error) return <Callout type="risk">Failed to load maintenance evidence: {error}</Callout>;
  if (!project) return <p className="muted">Loading diagnostics…</p>;

  return (
    <>
      <div className="rl-page-heading">
        <div>
          <p className="rl-eyebrow">Evidence, not a validity verdict</p>
          <h1 className="rl-page-title">Maintenance</h1>
        </div>
        <div className="row">
          <Chip color="red">{project.counts.errors} errors</Chip>
          <Chip color="amber">{project.counts.warnings} warnings</Chip>
          <Chip>{project.counts.orphans} orphans</Chip>
        </div>
      </div>

      {project.diagnostics.length === 0 ? (
        <Callout type="success">No maintenance evidence in the current corpus.</Callout>
      ) : (
        <div className="rl-diagnostics">
          {project.diagnostics.map((diagnostic, index) => (
            <Callout key={`${diagnostic.path}:${diagnostic.code}:${index}`} type={diagnostic.severity === "error" ? "risk" : "warn"}>
              <div className="row">
                <Chip>{diagnostic.severity}</Chip>
                <strong>{diagnostic.code}</strong>
                {diagnostic.path && project.documents.some((document) => document.path === diagnostic.path) ? (
                  <a href={documentRoute(diagnostic.path)}>{diagnostic.path}</a>
                ) : diagnostic.path ? <code>{diagnostic.path}</code> : null}
              </div>
              <p>{diagnostic.message}</p>
            </Callout>
          ))}
        </div>
      )}
    </>
  );
}
