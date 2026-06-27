import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Agent, type AgentCreated, type AgentKind } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatTime, isAgentOnline } from "../components/widgets";

const KIND_LABEL: Record<AgentKind, string> = {
  infra: "Infrastructure health",
  browser: "Browser E2E (Phase 2)",
  ai: "AI test agent (Phase 3)",
};

export default function Agents() {
  const { orgId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<AgentCreated | null>(null);
  const [form, setForm] = useState({
    kind: "infra" as AgentKind,
    name: "",
    description: "",
    capabilities: "",
  });
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setAgents(await api<Agent[]>("/agents/"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load agents");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [orgId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const agent = await api<AgentCreated>("/agents/", {
        method: "POST",
        body: JSON.stringify({
          kind: form.kind,
          name: form.name,
          description: form.description || null,
          capabilities: form.capabilities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setCreated(agent);
      setCreating(false);
      setForm({ kind: "infra", name: "", description: "", capabilities: "" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create agent");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this agent? Its tasks will be removed too.")) return;
    await api<void>(`/agents/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div className="page-header">
        <h2>Agents</h2>
        <button className="button" onClick={() => setCreating((v) => !v)}>
          {creating ? "Close" : "New agent"}
        </button>
      </div>

      {created && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <h3 style={{ marginTop: 0 }}>Agent registered: {created.name}</h3>
          <p className="muted">
            Copy this token now — it will not be shown again. Pass it to the
            daemon via <code>--token</code> or <code>AGENT_TOKEN</code>.
          </p>
          <pre className="logs" style={{ maxHeight: 80 }}>{created.token}</pre>
          <button className="button secondary" onClick={() => setCreated(null)}>
            I've saved it
          </button>
        </div>
      )}

      {creating && (
        <div className="card">
          <form onSubmit={submit}>
            <div className="form-row">
              <label>Kind</label>
              <select
                className="input"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as AgentKind })}
              >
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
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
              <label>Capabilities (comma-separated tags)</label>
              <input
                className="input"
                placeholder="linux, production-network, gpu"
                value={form.capabilities}
                onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
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
            <button className="button" type="submit">Create agent</button>
            {err && <div className="error">{err}</div>}
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        {agents.length === 0 ? (
          <p className="muted">
            No agents yet. Create one to start dispatching health checks,
            browser scripts, or AI-driven test runs.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Hostname</th>
                <th>Capabilities</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const online = isAgentOnline(a.last_seen_at);
                return (
                  <tr key={a.id}>
                    <td><Link to={`/agents/${a.id}`}>{a.name}</Link></td>
                    <td><span className="badge pending">{a.kind}</span></td>
                    <td>
                      <span className={`badge ${online ? "passed" : "failed"}`}>
                        {online ? "online" : "offline"}
                      </span>
                    </td>
                    <td>{a.hostname ?? <span className="muted">—</span>}</td>
                    <td>
                      {a.capabilities.length === 0
                        ? <span className="muted">—</span>
                        : a.capabilities.join(", ")}
                    </td>
                    <td>{a.last_seen_at ? formatTime(a.last_seen_at) : <span className="muted">never</span>}</td>
                    <td>
                      <button className="button secondary" onClick={() => remove(a.id)}>
                        Delete
                      </button>
                    </td>
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
