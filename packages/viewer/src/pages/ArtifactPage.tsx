import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  artifactContentUrl,
  documentRoute,
  fetchArtifact,
  type ArtifactView,
} from "../api";
import { Callout, Chip } from "../components/bits";

export function ArtifactPage() {
  const path = useParams()["*"] ?? "";
  const [view, setView] = useState<ArtifactView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setView(null);
    setError(null);
    fetchArtifact(path).then(setView).catch((reason) => setError(String(reason)));
  }, [path]);

  if (error) return <Callout type="risk">Failed to load {path}: {error}</Callout>;
  if (!view) return <p className="muted">Loading artifact…</p>;

  return (
    <>
      <Link to="/" className="rl-back">← catalog</Link>
      <div className="rl-page-heading">
        <div>
          <p className="rl-eyebrow">Searchable specification artifact</p>
          <h1 className="rl-page-title">{path.split("/").at(-1)}</h1>
          <code>{path}</code>
        </div>
        <Chip color="purple">{view.artifact.mediaType}</Chip>
      </div>

      <Callout type="info">
        This file is searchable support material. It is not a canonical knowledge node and its links do not create graph edges.
      </Callout>

      <section className="rl-section">
        <h2>Parent specifications</h2>
        <ul>
          {view.parents.map((parent) => (
            <li key={parent.path}><Link to={documentRoute(parent.path)}>{parent.label}</Link></li>
          ))}
        </ul>
      </section>

      {view.artifact.searchableText !== undefined ? (
        <pre className="rl-artifact-source">{view.artifact.searchableText}</pre>
      ) : (
        <a
          className="rl-btn"
          href={artifactContentUrl(path, true)}
          download={path.split("/").at(-1)}
        >
          download artifact
        </a>
      )}
    </>
  );
}
