import { Link } from "react-router-dom";
import type { DerivedData } from "../api";
import { Chip, Progress, Section, Status } from "./bits";

export function SpecMetaView({ meta }: { meta: DerivedData["meta"] }) {
  return (
    <div className="row mb-2">
      <Status value={meta.status}>{meta.status}</Status>
      <Chip color="blue">{meta.id}</Chip>
      {meta.created && <Chip>{meta.created}</Chip>}
    </div>
  );
}

export function TasksView({ tasks }: { tasks: DerivedData["tasks"] }) {
  if (tasks.total === 0) return null;
  return (
    <Section title="Tasks">
      <Progress value={tasks.done} max={tasks.total} label={`${tasks.done}/${tasks.total} tasks complete`} />
      {tasks.phases.length > 1 && (
        <div className="grid-2 mt-2">
          {tasks.phases.map((p, i) => (
            <Progress key={i} value={p.done} max={p.total} label={p.title} />
          ))}
        </div>
      )}
    </Section>
  );
}

export function ArtifactsView({
  artifacts,
  externalReads,
}: {
  artifacts: DerivedData["artifacts"];
  externalReads: DerivedData["external_reads"];
}) {
  if (!artifacts.length && !externalReads.length) return null;
  return (
    <Section title="Artifacts">
      <table className="rl-table">
        <thead>
          <tr>
            <th>Role</th>
            <th>Artifact</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {artifacts.map((a, i) => (
            <tr key={i}>
              <td><Chip color={a.role === "owns" ? "blue" : undefined}>{a.role}</Chip></td>
              <td><code>{a.path}</code></td>
              <td>{a.exists ? "" : <Chip color="red">missing</Chip>}</td>
            </tr>
          ))}
          {externalReads.map((e, i) => (
            <tr key={`x${i}`}>
              <td><Chip color="purple">external</Chip></td>
              <td><code>{e.entry}</code></td>
              <td>{e.exists ? "" : <Chip color="red">missing</Chip>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

export function ChangelogView({ entries }: { entries: DerivedData["changelog"] }) {
  if (!entries.length) return null;
  return (
    <Section title="Changelog">
      <ul>
        {entries.slice(0, 12).map((e, i) => (
          <li key={i}>
            <strong>{e.heading}</strong>
            {e.body && <span className="muted"> — {e.body.length > 160 ? e.body.slice(0, 157) + "…" : e.body}</span>}
          </li>
        ))}
      </ul>
      {entries.length > 12 && <p className="subtle">…and {entries.length - 12} older entries</p>}
    </Section>
  );
}

/** Small helper for dashboard spec cards. */
export function SpecCard({ id, title, status, done, total }: { id: string; title: string; status: string; done: number; total: number }) {
  return (
    <Link to={`/spec/${id}`} className="spec-link">
      <div className="rl-card">
        <div className="row mb-2">
          <Chip color="blue">{id}</Chip>
          <Status value={status}>{status}</Status>
        </div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {total > 0 && <Progress value={done} max={total} label={`${done}/${total} tasks`} />}
      </div>
    </Link>
  );
}
