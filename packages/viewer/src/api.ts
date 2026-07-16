/** API types — mirror ViewerContract §JSON API (served by `relic serve`). */

export type FragmentNode =
  | { kind: "text"; text: string }
  | { kind: "element"; tag: string; attrs: Record<string, string>; children: FragmentNode[]; warnings?: string[] }
  | { kind: "warning"; message: string; raw: string };

export interface FragmentLint {
  level: "error" | "warning";
  message: string;
}

export interface SpecSummary {
  id: string;
  title: string;
  status: string;
  tasks: { done: number; total: number };
  has_html: boolean;
}

export interface FixSummary {
  id: string;
  format: "html" | "md";
}

export interface ProjectInfo {
  project: { name: string; path: string };
  mode: string;
  specs: SpecSummary[];
  fixes: FixSummary[];
  validate: { valid: boolean; errors: number; warnings: number };
}

export interface TaskPhase {
  title: string;
  done: number;
  total: number;
  items: Array<{ text: string; done: boolean }>;
}

export interface DerivedData {
  meta: { id: string; title: string; status: string; created: string | null };
  tasks: { done: number; total: number; phases: TaskPhase[] };
  artifacts: Array<{ path: string; role: string; exists: boolean }>;
  external_reads: Array<{ entry: string; exists: boolean }>;
  changelog: Array<{ heading: string; body: string }>;
}

export interface SpecDetail {
  id: string;
  title: string;
  status: string;
  fragment: FragmentNode[];
  lints: FragmentLint[];
  files: { spec: string | null; plan: string | null; tasks: string | null };
  derived: DerivedData;
}

export interface FixDetail {
  id: string;
  format: "html" | "md";
  fragment: FragmentNode[] | null;
  lints: FragmentLint[];
  markdown: string | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const fetchProject = () => get<ProjectInfo>("/api/project");
export const fetchSpec = (id: string) => get<SpecDetail>(`/api/spec/${encodeURIComponent(id)}`);
export const fetchFix = (id: string) => get<FixDetail>(`/api/fix/${encodeURIComponent(id)}`);
