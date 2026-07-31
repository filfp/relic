import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  artifactRoute,
  documentRoute,
  fetchProject,
  searchProject,
  type DocumentSummary,
  type ProjectView,
  type SearchResult,
} from "../api";
import { Callout, Chip } from "../components/bits";

function DocumentCard({ document }: { document: DocumentSummary }) {
  return (
    <Link to={documentRoute(document.path)} className="rl-document-card">
      <div className="row">
        {document.id && <Chip color="blue">{document.id}</Chip>}
        {document.memberships.map((membership) => (
          <Chip key={membership}>{membership}</Chip>
        ))}
        {document.diagnostics.length > 0 && (
          <Chip color="amber">{document.diagnostics.length} diagnostic(s)</Chip>
        )}
      </div>
      <strong>{document.label}</strong>
      <code className="rl-path">{document.path}</code>
      <span className="subtle">
        {document.outgoing} outgoing · {document.backlinks} backlinks
      </span>
    </Link>
  );
}

function Result({ result }: { result: SearchResult }) {
  const route = result.type === "document"
    ? documentRoute(result.path)
    : artifactRoute(result.path);
  return (
    <Link to={route} className="rl-search-result">
      <div className="row">
        <Chip color={result.type === "document" ? "blue" : "purple"}>{result.type}</Chip>
        {"id" in result && result.id && <Chip>{result.id}</Chip>}
        <code>{result.path}</code>
      </div>
      {"label" in result && <strong>{result.label}</strong>}
      <p>{result.snippet}</p>
    </Link>
  );
}

export function Catalog() {
  const [project, setProject] = useState<ProjectView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);

  useEffect(() => {
    fetchProject().then(setProject).catch((reason) => setError(String(reason)));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) {
      setResults(null);
      return;
    }
    try {
      setResults((await searchProject(query)).results);
    } catch (reason) {
      setError(String(reason));
    }
  }

  if (error) return <Callout type="risk">Failed to load knowledge: {error}</Callout>;
  if (!project) return <p className="muted">Loading knowledge frontier…</p>;

  return (
    <>
      <div className="rl-page-heading">
        <div>
          <p className="rl-eyebrow">Current project knowledge</p>
          <h1 className="rl-page-title">{project.project.name}</h1>
          <code>{project.project.path}</code>
        </div>
        <div className="rl-counts">
          <span><strong>{project.counts.documents}</strong> documents</span>
          <span><strong>{project.counts.artifacts}</strong> artifacts</span>
          <span><strong>{project.counts.diagnostics}</strong> diagnostics</span>
        </div>
      </div>

      <form className="rl-search" onSubmit={submit}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search IDs, knowledge, paths, and spec artifacts"
          aria-label="Search project knowledge"
        />
        <button className="rl-btn" type="submit">search</button>
      </form>

      {results !== null && (
        <section className="rl-section">
          <div className="rl-section-heading">
            <h2>Search results</h2>
            <span className="subtle">{results.length} match(es)</span>
          </div>
          {results.length > 0
            ? results.map((result) => <Result key={`${result.type}:${result.path}`} result={result} />)
            : <p className="muted">No knowledge matched this query.</p>}
        </section>
      )}

      <section className="rl-section">
        <div className="rl-section-heading">
          <h2>Canonical catalog</h2>
          <span className="subtle">Every canonical node, including orphans</span>
        </div>
        <div className="rl-catalog">
          {project.documents.map((document) => (
            <DocumentCard key={document.path} document={document} />
          ))}
        </div>
      </section>
    </>
  );
}
