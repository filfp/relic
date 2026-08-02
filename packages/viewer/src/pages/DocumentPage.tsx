import { useEffect, useState } from "react";

import {
  artifactRoute,
  documentRoute,
  fetchDocument,
  type Diagnostic,
  type DocumentView,
  type KnowledgeLink,
} from "../api";
import { Callout, Chip } from "../components/bits";
import { Fragment } from "../components/Fragment";
import { KnowledgeAnchor } from "../components/KnowledgeAnchor";
import { Markdown } from "../components/Markdown";
import { Metadata } from "../components/Metadata";
import { diagnosticTone } from "../diagnostics";

function DiagnosticList({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (diagnostics.length === 0) return null;
  return (
    <section className="rl-section">
      <h2>Maintenance evidence</h2>
      <div className="rl-diagnostics">
        {diagnostics.map((diagnostic, index) => (
          <Callout key={`${diagnostic.code}:${index}`} type={diagnosticTone(diagnostic.severity)}>
            <strong>{diagnostic.code}</strong> — {diagnostic.message}
            {diagnostic.href && <code>{diagnostic.href}</code>}
          </Callout>
        ))}
      </div>
    </section>
  );
}

function Outgoing({ link }: { link: KnowledgeLink }) {
  return (
    <li>
      <KnowledgeAnchor relation={link} href={link.href}>
        {link.text || link.href}
      </KnowledgeAnchor>
      <span className="subtle"> — {link.status}</span>
    </li>
  );
}

export function DocumentPage({ path }: { path: string }) {
  const [view, setView] = useState<DocumentView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setView(null);
    setError(null);
    fetchDocument(path).then(setView).catch((reason) => setError(String(reason)));
  }, [path]);

  if (error) return <Callout type="risk">Failed to load {path}: {error}</Callout>;
  if (!view) return <p className="muted">Loading document…</p>;

  const { document } = view;
  return (
    <>
      <a href="/" className="rl-back">← catalog</a>
      <div className="rl-page-heading">
        <div>
          <p className="rl-eyebrow">{document.format}</p>
          <h1 className="rl-page-title">{document.label}</h1>
          <code>{document.path}</code>
        </div>
        <div className="row">
          {document.id && <Chip color="blue">{document.id}</Chip>}
          {document.memberships.map((membership) => <Chip key={membership}>{membership}</Chip>)}
        </div>
      </div>

      <Metadata metadata={document.metadata} />

      <DiagnosticList diagnostics={document.diagnostics} />

      <article className="rl-document">
        {document.format === "spec-html" && document.htmlAst && (
          <Fragment nodes={document.htmlAst} links={document.links} sourcePath={document.path} />
        )}
        {document.format === "markdown" && document.markdownAst && (
          <Markdown ast={document.markdownAst} links={document.links} sourcePath={document.path} />
        )}
      </article>

      <div className="rl-grid-two">
        <section className="rl-section">
          <h2>Outgoing references</h2>
          {document.links.length > 0
            ? <ul>{document.links.map((link, index) => <Outgoing key={`${link.href}:${index}`} link={link} />)}</ul>
            : <p className="muted">No outgoing references.</p>}
        </section>
        <section className="rl-section">
          <h2>Backlinks</h2>
          {document.backlinks.length > 0
            ? (
              <ul>
                {document.backlinks.map((backlink) => (
                  <li key={backlink.sourcePath}>
                    <a href={documentRoute(backlink.sourcePath)}>{backlink.text || backlink.sourcePath}</a>
                    <code className="rl-path">{backlink.sourcePath}</code>
                  </li>
                ))}
              </ul>
            )
            : <p className="muted">No backlinks.</p>}
        </section>
      </div>

      {view.related.length > 0 && (
        <section className="rl-section">
          <h2>Related knowledge</h2>
          <div className="rl-catalog">
            {view.related.map((related) => (
              <a key={related.path} href={documentRoute(related.path)} className="rl-document-card">
                <div className="row">
                  {related.id && <Chip color="blue">{related.id}</Chip>}
                  {related.memberships.map((membership) => (
                    <Chip key={membership}>{membership}</Chip>
                  ))}
                </div>
                <strong>{related.label}</strong>
                <code className="rl-path">{related.path}</code>
              </a>
            ))}
          </div>
        </section>
      )}

      {view.artifacts.length > 0 && (
        <section className="rl-section">
          <h2>Specification artifacts</h2>
          <div className="rl-catalog">
            {view.artifacts.map((artifact) => (
              <a key={artifact.path} href={artifactRoute(artifact.path)} className="rl-document-card">
                <div className="row">
                  <Chip color="purple">artifact</Chip>
                  <Chip>{artifact.mediaType}</Chip>
                </div>
                <code className="rl-path">{artifact.path}</code>
              </a>
            ))}
          </div>
        </section>
      )}

      <details className="rl-source">
        <summary>Raw canonical source</summary>
        <pre>{document.source}</pre>
      </details>
    </>
  );
}
