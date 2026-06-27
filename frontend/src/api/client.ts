export type ApiOptions = RequestInit & { orgId?: number | null };

const TOKEN_KEY = "fh.token";
const ORG_KEY = "fh.orgId";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getOrgId(): number | null {
  const raw = localStorage.getItem(ORG_KEY);
  return raw ? Number(raw) : null;
}
export function setOrgId(id: number | null) {
  if (id == null) localStorage.removeItem(ORG_KEY);
  else localStorage.setItem(ORG_KEY, String(id));
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    const msg =
      typeof detail === "string"
        ? detail
        : (detail as { detail?: string } | null)?.detail ?? `HTTP ${status}`;
    super(msg);
    this.status = status;
    this.detail = detail;
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const orgId = options.orgId ?? getOrgId();
  if (orgId != null) headers.set("X-Organization-Id", String(orgId));

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// Domain types — mirror backend pydantic schemas.
export type User = { id: number; email: string; full_name: string | null };
export type Organization = { id: number; name: string; slug: string };
export type Membership = { organization: Organization; role: "owner" | "admin" | "member" };
export type Me = { user: User; memberships: Membership[] };

export type Project = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export type Suite = {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  command: string;
  working_dir: string | null;
  env: Record<string, string>;
  timeout_seconds: number;
  created_at: string;
};

export type RunStatus = "pending" | "running" | "passed" | "failed" | "error" | "canceled";

export type Run = {
  id: number;
  suite_id: number;
  status: RunStatus;
  exit_code: number | null;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type RunDetail = Run & {
  logs: string;
  triggered_by: User | null;
};
