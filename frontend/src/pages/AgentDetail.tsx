import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Agent, type AgentTask, type AgentTaskDetail } from "../api/client";
import { StatusBadge, formatDuration, formatTime, isAgentOnline } from "../components/widgets";

const SAMPLE_PAYLOAD: Record<string, string> = {
  infra: JSON.stringify({
    checks: [
      { type: "ping", target: "1.1.1.1", count: 2 },
      { type: "http", url: "https://example.com", expect_status: 200 },
      { type: "disk", path: "/", min_free_pct: 10 },
    ],
  }, null, 2),
  browser: JSON.stringify({
    base_url: "https://example.com",
    steps: [{ goto: "/" }, { expect_text: "Example Domain" }],
  }, null, 2),
  ai: JSON.stringify({
    repo_url: "https://github.com/user/repo",
    ref: "main",
    instruction: "Generate unit tests for src/calculator.py and run them.",
  }, null, 2),
};

export default function AgentDetail() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selected, setSelected] = useState<AgentTaskDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", payload: "" });
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!agentId) return;
    try {
      const [a, ts] = await Promise.all([
        api<Agent>(`/agents/${agentId}`),
        api<AgentTask[]>(`/agent-tasks/?agent_id=${agentId}`),
      ]);
      setAgent(a);
      setTasks(ts);
      if (!form.payload) {
        setForm((f) => ({ ...f, payload: SAMPLE_PAYLOAD[a.kind] ?? "{}" }));
      }
      if (selected) {
        setSelected(await api<AgentTaskDetail>(`/agent-tasks/${selected.id}`));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, selected?.id]);

  async function dispatch(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(form.payload);
    } catch {
      setErr("Payload must be valid JSON");
      return;
    }
    try {
      await api<AgentTask>(`/agent-tasks/`, {
        method: "POST",
        body: JSON.stringify({
          agent_id: Number(agentId),
          name: form.name,
          payload: parsed,
        }),
      });
      setCreating(false);
      setForm({ name: "", payload: SAMPLE_PAYLOAD[agent?.kind ?? "infra"] ?? "{}" });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to dispatch task");
    }
  }

  if (!agent) return <div>Loading…</div>;
  const online = isAgentOnline(agent.last_seen_at);

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/agents" className="muted">← Agents</Link>
          <h2 style={{ margin: "4px 0 0" }}>
            {agent.name}{" "}
            <span className={`badge ${online ? "passed" : "failed"}`}>
              {online ? "online" : "offline"}
            </span>
          </h2>
        </div>
        <button className="button" onClick={() => setCreating((v) => !v)}>
          {creating ? "Close" : "Dispatch task"}
        </button>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 24, flexWrap: "wrap" }}>
          <Field label="Kind">{agent.kind}</Field>
          <Field label="Hostname">{agent.hostname ?? "—"}</Field>
          <Field label="Capabilities">
            {agent.capabilities.length === 0 ? "—" : agent.capabilities.join(", ")}
          </Field>
          <Field label="Last seen">
            {agent.last_seen_at ? formatTime(agent.last_seen_at) : "never"}
          </Field>
        </div>
        {agent.description && (
          <div className="muted" style={{ marginTop: 12 }}>{agent.description}</div>
        )}
      </div>

      {creating && (
        <div className="card" style={{ marginTop: 12 }}>
          <form onSubmit={dispatch}>
            <div className="form-row">
              <label>Task name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nightly infra checks"
                required
              />
            </div>
            <div className="form-row">
              <label>Payload (JSON)</label>
              <textarea
                className="input"
                rows={10}
                style={{ fontFamily: "ui-monospace, monospace" }}
                value={form.payload}
                onChange={(e) => setForm({ ...form, payload: e.target.value })}
              />
            </div>
            <button className="button" type="submit">Queue task</button>
            {err && <div className="error">{err}</div>}
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Tasks</h3>
        {tasks.length === 0 ? (
          <p className="muted">No tasks yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Queued</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{formatDuration(t.started_at, t.finished_at)}</td>
                  <td>{formatTime(t.queued_at)}</td>
                  <td>
                    <button
                      className="button secondary"
                      onClick={async () =>
                        setSelected(await api<AgentTaskDetail>(`/agent-tasks/${t.id}`))
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>Task #{selected.id} — {selected.name}</h3>
            <button className="button secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div className="row" style={{ gap: 24, flexWrap: "wrap", marginTop: 8 }}>
            <Field label="Status"><StatusBadge status={selected.status} /></Field>
            <Field label="Duration">
              {formatDuration(selected.started_at, selected.finished_at)}
            </Field>
            <Field label="Queued">{formatTime(selected.queued_at)}</Field>
            <Field label="Finished">
              {selected.finished_at ? formatTime(selected.finished_at) : "—"}
            </Field>
            <Field label="By">{selected.triggered_by?.email ?? "—"}</Field>
          </div>
          {selected.error_message && (
            <div className="error" style={{ marginTop: 8 }}>{selected.error_message}</div>
          )}
          <h4>Payload</h4>
          <pre className="logs">{JSON.stringify(selected.payload, null, 2)}</pre>
          <h4>Logs</h4>
          <pre className="logs">{selected.logs || "(no output)"}</pre>
          <h4>Result</h4>
          <pre className="logs">
            {selected.result ? JSON.stringify(selected.result, null, 2) : "(no result yet)"}
          </pre>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{children}</div>
    </div>
  );
}
