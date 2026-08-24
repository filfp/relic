import { useEffect, useState } from "react";

import {
  artifactContentUrl,
  documentRoute,
  fetchArtifact,
  type ArtifactView,
} from "../api";
import { Callout, Chip } from "../components/bits";
import { ProjectChip } from "../components/ProjectChip";

export function ArtifactPage({ path, project }: { path: string; project?: string }) {
  const [view, setView] = useState<ArtifactView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setView(null);
    setError(null);
    fetchArtifact(path, project).then(setView).catch((reason) => setError(String(reason)));
  }, [path, project]);

  if (error) return <Callout type="risk">Failed to load {path}: {error}</Callout>;
  if (!view) return <p className="muted">Loading artifact…</p>;
  const artifactProject = "project" in view.artifact
    ? view.artifact.project
    : undefined;

  return (
    <>
      <a href="/" className="rl-back">← catalog</a>
      <div className="rl-page-heading">
        <div>
          <p className="rl-eyebrow">
            {view.artifact.searchableText !== undefined
              ? "Searchable specification artifact"
              : view.artifact.mediaType === "text"
                ? "Text specification artifact"
                : "Binary specification artifact"}
          </p>
          <h1 className="rl-page-title">{path.split("/").at(-1)}</h1>
          <code>{path}</code>
        </div>
        <div className="row">
          <ProjectChip address={artifactProject} />
          <Chip color="purple">{view.artifact.mediaType}</Chip>
        </div>
      </div>

      <Callout type="info">
        This file is searchable support material. It is not a canonical knowledge node and its links do not create graph edges.
      </Callout>

      <section className="rl-section">
        <h2>Parent specifications</h2>
        <ul>
          {view.parents.map((parent) => (
            <li key={`${"project" in parent ? parent.project.join("/") : "local"}:${parent.path}`}>
              <a href={documentRoute(
                parent.path,
                "project" in parent ? parent.project : undefined,
              )}>{parent.label}</a>
              <ProjectChip address={"project" in parent ? parent.project : undefined} />
            </li>
          ))}
        </ul>
      </section>

      {view.artifact.searchableText !== undefined ? (
        <pre className="rl-artifact-source">{view.artifact.searchableText}</pre>
      ) : (
        <a
          className="rl-btn"
          href={artifactContentUrl(path, true, artifactProject)}
          download={path.split("/").at(-1)}
        >
          download artifact
        </a>
      )}
    </>
  );
}
