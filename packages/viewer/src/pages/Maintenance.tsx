import { useEffect, useState } from "react";

import {
  documentRoute,
  fetchProject,
  isFederatedProjectView,
  type FederatedKnowledgeDiagnostic,
  type ProjectAddress,
  type ProjectView,
} from "../api";
import { Callout, Chip } from "../components/bits";
import { ProjectChip } from "../components/ProjectChip";
import { diagnosticTone } from "../diagnostics";

export function Maintenance() {
  const [project, setProject] = useState<ProjectView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProject().then(setProject).catch((reason) => setError(String(reason)));
  }, []);

  if (error) return <Callout type="risk">Failed to load maintenance evidence: {error}</Callout>;
  if (!project) return <p className="muted">Loading diagnostics…</p>;

  const diagnostics = project.diagnostics.map((item) =>
    "diagnostic" in item
      ? item
      : { project: undefined, diagnostic: item }
  );
  const documentFor = (
    path: string | undefined,
    owner: ProjectAddress | undefined,
  ) => path
    ? project.documents.find((document) =>
        document.path === path &&
        (owner === undefined || (
          "project" in document &&
          (document as { project: ProjectAddress }).project.join("/") === owner.join("/")
        ))
      )
    : undefined;

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

      {isFederatedProjectView(project) && (
        <section className="rl-section">
          <div className="rl-section-heading">
            <h2>Federation edges</h2>
            <span className="subtle">{project.federation.edges.length} declaration(s)</span>
          </div>
          <div className="rl-federation-edges">
            {project.federation.edges.map((edge) => (
              <div
                className="rl-federation-edge"
                key={`${edge.parent.join("/")}:${edge.key}`}
              >
                <code>{edge.parent.join("/")}</code>
                <span>→</span>
                <strong>{edge.key}</strong>
                {edge.child && <code>{edge.child.join("/")}</code>}
                <Chip color={edge.status === "valid" ? "green" : "amber"}>
                  {edge.status}
                </Chip>
              </div>
            ))}
          </div>
        </section>
      )}

      {diagnostics.length === 0 ? (
        <Callout type="success">No maintenance evidence in the current corpus.</Callout>
      ) : (
        <div className="rl-diagnostics">
          {diagnostics.map((item, index) => {
            const diagnostic = item.diagnostic;
            const owner = item.project as ProjectAddress | undefined;
            const target = documentFor(diagnostic.path, owner);
            const federationItem = item as FederatedKnowledgeDiagnostic;
            return (
            <Callout
              key={`${owner?.join("/")}:${diagnostic.path}:${diagnostic.code}:${index}`}
              type={diagnosticTone(diagnostic.severity)}
            >
              <div className="row">
                <Chip>{diagnostic.severity}</Chip>
                <ProjectChip address={owner} />
                {federationItem.edge && (
                  <Chip>{`federation.members.${federationItem.edge.key}`}</Chip>
                )}
                <strong>{diagnostic.code}</strong>
                {diagnostic.path && target ? (
                  <a href={documentRoute(diagnostic.path, owner)}>{diagnostic.path}</a>
                ) : diagnostic.path ? <code>{diagnostic.path}</code> : null}
              </div>
              <p>{diagnostic.message}</p>
            </Callout>
            );
          })}
        </div>
      )}
    </>
  );
}
