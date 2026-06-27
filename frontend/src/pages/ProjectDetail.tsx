import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Project, type Run, type Suite } from "../api/client";
import { StatusBadge, formatDuration, formatTime } from "../components/widgets";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    command: "",
    working_dir: "",
    description: "",
    timeout_seconds: 600,
    env: "",
  });
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    if (!projectId) return;
    try {
      const [proj, suiteList] = await Promise.all([
        api<Project>(`/projects/${projectId}`),
        api<Suite[]>(`/projects/${projectId}/suites/`),
      ]);
      setProject(proj);
      setSuites(suiteList);
      const allRuns: Run[] = [];
      for (const s of suiteList) {
        const r = await api<Run[]>(`/runs/?suite_id=${s.id}&limit=5`);
        allRuns.push(...r);
      }
      allRuns.sort((a, b) => (b.queued_at > a.queued_at ? 1 : -1));
      setRuns(allRuns.slice(0, 20));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 4000);
    return () => clearInterval(id);
  }, [projectId]);

  async function submitSuite(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    let envObj: Record<string, string> = {};
    if (form.env.trim()) {
      try {
        envObj = JSON.parse(form.env);
      } catch {
        setErr("Env vars must be valid JSON, e.g. {\"NODE_ENV\":\"test\"}");
        return;
      }
    }
    try {
      await api<Suite>(`/projects/${projectId}/suites/`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          command: form.command,
          working_dir: form.working_dir || null,
          description: form.description || null,
          timeout_seconds: Number(form.timeout_seconds),
          env: envObj,
        }),
      });
      setForm({ name: "", command: "", working_dir: "", description: "", timeout_seconds: 600, env: "" });
      setCreating(false);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create suite");
    }
  }

  async function triggerRun(suiteId: number) {
    try {
      const run = await api<Run>(`/runs/?suite_id=${suiteId}`, { method: "POST" });
      navigate(`/runs/${run.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to trigger run");
    }
  }

  async function deleteSuite(suiteId: number) {
    if (!confirm("Delete this suite and all its runs?")) return;
    try {
      await api<void>(`/projects/${projectId}/suites/${suiteId}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete suite");
    }
  }

  if (!project) return <div>Loading…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/projects" className="muted">← Projects</Link>
          <h2 style={{ margin: "4px 0 0" }}>{project.name}</h2>
        </div>
        <button className="button" onClick={() => setCreating((v) => !v)}>
          {creating ? "Close" : "New test suite"}
        </button>
      </div>

      {creating && (
        <div className="card">
          <form onSubmit={submitSuite}>
            <div className="form-row">
              <label>Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <label>Command</label>
              <textarea
                className="input"
                rows={2}
                placeholder="e.g. pytest -q tests/"
                value={form.command}
                onChange={(e) => setForm({ ...form, command: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <label>Working directory</label>
              <input
                className="input"
                placeholder="/path/to/repo (defaults to server cwd)"
                value={form.working_dir}
                onChange={(e) => setForm({ ...form, working_dir: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Timeout (seconds)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={86400}
                value={form.timeout_seconds}
                onChange={(e) =>
                  setForm({ ...form, timeout_seconds: Number(e.target.value) })
                }
              />
            </div>
            <div className="form-row">
              <label>Environment variables (JSON)</label>
              <textarea
                className="input"
                rows={3}
                placeholder='{"NODE_ENV":"test"}'
                value={form.env}
                onChange={(e) => setForm({ ...form, env: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Description</label>
              <textarea
                className="input"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <button className="button" type="submit">Create suite</button>
            {err && <div className="error">{err}</div>}
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Test suites</h3>
        {suites.length === 0 ? (
          <p className="muted">No suites yet. Create one to start orchestrating runs.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Command</th>
                <th>Timeout</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {suites.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td><code>{s.command}</code></td>
                  <td>{s.timeout_seconds}s</td>
                  <td>
                    <button className="button" onClick={() => triggerRun(s.id)}>
                      Run now
                    </button>
                  </td>
                  <td>
                    <button
                      className="button secondary"
                      onClick={() => deleteSuite(s.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Recent runs in this project</h3>
        {runs.length === 0 ? (
          <p className="muted">No runs yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Suite</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Queued</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const suite = suites.find((s) => s.id === r.suite_id);
                return (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{suite?.name ?? r.suite_id}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{formatDuration(r.started_at, r.finished_at)}</td>
                    <td>{formatTime(r.queued_at)}</td>
                    <td><Link to={`/runs/${r.id}`}>Open</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
