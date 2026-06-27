import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Run } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, formatTime } from "../components/widgets";

export default function Dashboard() {
  const { orgId } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api<Run[]>("/runs/?limit=20");
        if (mounted) setRuns(data);
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : "Failed to load runs");
      }
    }
    load();
    const id = setInterval(load, 4000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [orgId]);

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <Link to="/projects" className="button secondary">Manage projects</Link>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent runs</h3>
        {err && <div className="error">{err}</div>}
        {runs.length === 0 ? (
          <p className="muted">
            No runs yet. Head to <Link to="/projects">Projects</Link>, create a project and a test
            suite, then trigger your first run.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Suite</th>
                <th>Status</th>
                <th>Exit</th>
                <th>Queued</th>
                <th>Finished</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{r.suite_id}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.exit_code ?? "—"}</td>
                  <td>{formatTime(r.queued_at)}</td>
                  <td>{r.finished_at ? formatTime(r.finished_at) : "—"}</td>
                  <td><Link to={`/runs/${r.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
