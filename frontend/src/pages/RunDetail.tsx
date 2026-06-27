import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type RunDetail } from "../api/client";
import { StatusBadge, formatDuration, formatTime } from "../components/widgets";

export default function RunDetailPage() {
  const { runId } = useParams();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    let stop = false;
    async function load() {
      try {
        const data = await api<RunDetail>(`/runs/${runId}`);
        if (!stop) setRun(data);
        if (data.status !== "pending" && data.status !== "running") {
          stop = true;
        }
      } catch (e) {
        if (!stop) setErr(e instanceof Error ? e.message : "Failed to load run");
        stop = true;
      }
    }
    load();
    const id = setInterval(() => {
      if (!stop) load();
    }, 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [runId]);

  async function cancel() {
    if (!runId) return;
    try {
      const data = await api<RunDetail>(`/runs/${runId}/cancel`, { method: "POST" });
      setRun((prev) => (prev ? { ...prev, ...data } : prev));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to cancel");
    }
  }

  if (err) return <div className="error">{err}</div>;
  if (!run) return <div>Loading…</div>;

  const cancellable = run.status === "pending" || run.status === "running";

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/" className="muted">← Dashboard</Link>
          <h2 style={{ margin: "4px 0 0" }}>Run #{run.id}</h2>
        </div>
        {cancellable && (
          <button className="button secondary" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ gap: 24, flexWrap: "wrap" }}>
          <Field label="Status"><StatusBadge status={run.status} /></Field>
          <Field label="Exit code">{run.exit_code ?? "—"}</Field>
          <Field label="Duration">{formatDuration(run.started_at, run.finished_at)}</Field>
          <Field label="Queued">{formatTime(run.queued_at)}</Field>
          <Field label="Started">{run.started_at ? formatTime(run.started_at) : "—"}</Field>
          <Field label="Finished">{run.finished_at ? formatTime(run.finished_at) : "—"}</Field>
          <Field label="Triggered by">{run.triggered_by?.email ?? "—"}</Field>
        </div>
        {run.error_message && (
          <div className="error" style={{ marginTop: 12 }}>{run.error_message}</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Logs</h3>
        <pre className="logs">{run.logs || "(no output yet)"}</pre>
      </div>
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
