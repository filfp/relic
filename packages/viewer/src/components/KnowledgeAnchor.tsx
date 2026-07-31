import type { ReactNode } from "react";

import {
  artifactRoute,
  documentRoute,
  type KnowledgeLink,
} from "../api";

export function KnowledgeAnchor({
  relation,
  href,
  children,
}: {
  relation?: KnowledgeLink;
  href?: string;
  children: ReactNode;
}) {
  if (!relation) return href ? <a href={href}>{children}</a> : <>{children}</>;

  switch (relation.status) {
    case "canonical":
      return relation.targetPath ? (
        <a href={`${documentRoute(relation.targetPath)}${relation.fragment ? `#${relation.fragment}` : ""}`}>
          {children}
        </a>
      ) : <>{children}</>;
    case "artifact":
      return relation.resolvedPath ? (
        <a href={artifactRoute(relation.resolvedPath)}>{children}</a>
      ) : <>{children}</>;
    case "external":
      return (
        <a href={relation.href} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    case "fragment":
      return <a href={relation.href}>{children}</a>;
    case "missing":
      return (
        <span className="rl-broken-link" title={`Missing: ${relation.resolvedPath ?? relation.href}`}>
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
