import type { RunStatus } from "../api/client";

export function StatusBadge({ status }: { status: RunStatus }) {
  return <span className={`badge ${status}`}>{status}</span>;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "—";
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  const ms = Math.max(0, b - a);
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s`;
}
