import type { ReactNode } from "react";

import {
  artifactRoute,
  documentRoute,
  type KnowledgeLink,
} from "../api";

export function KnowledgeAnchor({
  relation,
  href,
  title,
  children,
}: {
  relation?: KnowledgeLink;
  href?: string;
  title?: string;
  children: ReactNode;
}) {
  if (!relation) return href ? <a href={href} title={title}>{children}</a> : <>{children}</>;

  const federated = "source" in relation;

  switch (relation.status) {
    case "canonical":
      return federated && relation.target ? (
        <a
          href={`${documentRoute(relation.target.path, relation.target.project)}${relation.fragment ? `#${relation.fragment}` : ""}`}
          title={title}
        >
          {children}
        </a>
      ) : !federated && relation.targetPath ? (
        <a
          href={`${documentRoute(relation.targetPath)}${relation.fragment ? `#${relation.fragment}` : ""}`}
          title={title}
        >
          {children}
        </a>
      ) : <>{children}</>;
    case "artifact":
      return federated && relation.target ? (
        <a href={artifactRoute(relation.target.path, relation.target.project)} title={title}>
          {children}
        </a>
      ) : !federated && relation.resolvedPath ? (
        <a href={artifactRoute(relation.resolvedPath)} title={title}>{children}</a>
      ) : <>{children}</>;
    case "external":
      return (
        <a href={relation.href} target="_blank" rel="noreferrer" title={title}>
          {children}
        </a>
      );
    case "fragment":
      return <a href={relation.href} title={title}>{children}</a>;
    case "missing":
      return (
        <span
          className="rl-broken-link"
          title={`Missing: ${
            federated
              ? relation.resolved?.path ?? relation.href
              : relation.resolvedPath ?? relation.href
          }`}
        >
          {children} <span className="rl-link-chip">broken</span>
        </span>
      );
    case "unsafe":
      return (
        <span className="rl-broken-link" title="Unsafe link was not activated">
          {children} <span className="rl-link-chip">unsafe</span>
        </span>
      );
    case "project-file":
      return (
        <span title="File exists outside the canonical knowledge corpus">
          {children} <span className="rl-link-chip">project file</span>
        </span>
      );
  }
}
