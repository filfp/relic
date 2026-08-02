import { useEffect, useState, type FormEvent } from "react";

import {
  artifactRoute,
  documentRoute,
  fetchProject,
  searchProject,
  type DocumentSummary,
  type ProjectView,
  type SearchResult,
} from "../api";
import { catalogGroups, membershipOptions, type CatalogGroup } from "../catalog";
import { Callout, Chip } from "../components/bits";

function CatalogItem({ document }: { document: DocumentSummary }) {
  return (
    <a href={documentRoute(document.path)} className="rl-catalog-item">
      <div className="rl-catalog-identity">
        {document.id && <Chip color="blue">{document.id}</Chip>}
        <strong>{document.label}</strong>
        <code className="rl-path">{document.path}</code>
      </div>
      <div className="rl-catalog-signals">
        <span className="subtle">
          {document.outgoing} outgoing · {document.backlinks} backlinks
        </span>
        {document.diagnostics.length > 0 && (
          <Chip color="amber">{document.diagnostics.length} diagnostic(s)</Chip>
        )}
      </div>
    </a>
  );
}

export function CatalogGroups({ groups }: { groups: CatalogGroup[] }) {
  return (
    <div className="rl-catalog-groups">
      {groups.map((group) => (
        <details className="rl-catalog-group" key={group.key} open>
          <summary>
            <span className="rl-catalog-group-title">
              {group.memberships.length > 0
                ? group.memberships.map((membership) => <Chip key={membership}>{membership}</Chip>)
                : <span>unclassified</span>}
            </span>
            <span className="subtle">{group.documents.length} document(s)</span>
          </summary>
          <div className="rl-catalog-list">
            {group.documents.map((document) => (
              <CatalogItem key={document.path} document={document} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function Result({ result }: { result: SearchResult }) {
  const route = result.type === "document"
    ? documentRoute(result.path)
    : artifactRoute(result.path);
  return (
    <a href={route} className="rl-search-result">
      <div className="row">
        <Chip color={result.type === "document" ? "blue" : "purple"}>{result.type}</Chip>
        {"id" in result && result.id && <Chip>{result.id}</Chip>}
        <code>{result.path}</code>
      </div>
      {"label" in result && <strong>{result.label}</strong>}
      <p>{result.snippet}</p>
    </a>
  );
}

export function Catalog() {
  const [project, setProject] = useState<ProjectView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [activeMembership, setActiveMembership] = useState<string | null>(null);

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

  const memberships = membershipOptions(project);
  const counts = new Map(memberships.map((membership) => [
    membership,
    project.documents.filter((document) => document.memberships.includes(membership)).length,
  ]));
  const groups = catalogGroups(project.documents, memberships, activeMembership);

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

      <div className="rl-catalog-controls">
        <form className="rl-search" onSubmit={submit}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search IDs, knowledge, paths, and spec artifacts"
            aria-label="Search project knowledge"
          />
          <button className="rl-btn" type="submit">search</button>
        </form>
        <div
          className="rl-membership-filters"
          role="group"
          aria-label="Filter catalog by membership"
        >
          <span className="subtle">Focus</span>
          <button
            className={`rl-filter-chip${activeMembership === null ? " active" : ""}`}
            type="button"
            aria-pressed={activeMembership === null}
            onClick={() => setActiveMembership(null)}
          >
            all <span>{project.documents.length}</span>
          </button>
          {memberships.map((membership) => (
            <button
              className={`rl-filter-chip${activeMembership === membership ? " active" : ""}`}
              key={membership}
              type="button"
              aria-pressed={activeMembership === membership}
              onClick={() => setActiveMembership(membership)}
            >
              {membership} <span>{counts.get(membership)}</span>
            </button>
          ))}
        </div>
      </div>

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
          <span className="subtle">
            {activeMembership ? `${counts.get(activeMembership)} focused` : "Every canonical node, including orphans"}
          </span>
        </div>
        <CatalogGroups key={activeMembership ?? "all"} groups={groups} />
      </section>
    </>
  );
}
