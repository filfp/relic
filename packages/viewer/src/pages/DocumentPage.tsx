import { useEffect, useState } from "react";

import {
  artifactRoute,
  documentRoute,
  fetchDocument,
  type Diagnostic,
  type DocumentView,
  type KnowledgeBacklink,
  type KnowledgeLink,
  type ProjectAddress,
} from "../api";
import { Callout, Chip } from "../components/bits";
import { Fragment } from "../components/Fragment";
import { KnowledgeAnchor } from "../components/KnowledgeAnchor";
import { Markdown } from "../components/Markdown";
import { Metadata } from "../components/Metadata";
import { ProjectChip } from "../components/ProjectChip";
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

function Backlink({ backlink }: { backlink: KnowledgeBacklink }) {
  const source = "source" in backlink
    ? backlink.source
    : { path: backlink.sourcePath, project: undefined };
  return (
    <li>
      <a href={documentRoute(source.path, source.project)}>
        {backlink.text || source.path}
      </a>
      <ProjectChip address={source.project} />
      <code className="rl-path">{source.path}</code>
    </li>
  );
}

function addressedProject<T extends { path: string }>(
  value: T | (T & { project: ProjectAddress }),
): ProjectAddress | undefined {
  return "project" in value ? value.project as ProjectAddress : undefined;
}

export function DocumentPage({ path, project }: { path: string; project?: string }) {
  const [view, setView] = useState<DocumentView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setView(null);
    setError(null);
    fetchDocument(path, project).then(setView).catch((reason) => setError(String(reason)));
  }, [path, project]);

  if (error) return <Callout type="risk">Failed to load {path}: {error}</Callout>;
  if (!view) return <p className="muted">Loading document…</p>;

  const { document } = view;
  const documentProject = "project" in document ? document.project : undefined;
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
          <ProjectChip address={documentProject} />
          {document.memberships.map((membership) => <Chip key={membership}>{membership}</Chip>)}
        </div>
      </div>

      <Metadata metadata={document.metadata} />

      <DiagnosticList diagnostics={document.diagnostics} />

      <article className="rl-document">
        {document.format === "spec-html" && document.htmlAst && (
          <Fragment nodes={document.htmlAst} links={document.links} sourcePath={document.path} project={documentProject} />
        )}
        {document.format === "markdown" && document.markdownAst && (
          <Markdown ast={document.markdownAst} links={document.links} sourcePath={document.path} project={documentProject} />
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
                {document.backlinks.map((backlink, index) => (
                  <Backlink key={`${backlink.href}:${index}`} backlink={backlink} />
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
              <a
                key={`${addressedProject(related)?.join("/") ?? "local"}:${related.path}`}
                href={documentRoute(related.path, addressedProject(related))}
                className="rl-document-card"
              >
                <div className="row">
                  <ProjectChip address={addressedProject(related)} />
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
              <a
                key={`${addressedProject(artifact)?.join("/") ?? "local"}:${artifact.path}`}
                href={artifactRoute(artifact.path, addressedProject(artifact))}
                className="rl-document-card"
              >
                <div className="row">
                  <Chip color="purple">artifact</Chip>
                  <ProjectChip address={addressedProject(artifact)} />
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
