import Link from "next/link";
import { getDashboardStats } from "@/lib/repository";
import { STATUSES, STATUS_LABELS } from "@/lib/types";
import { formatCurrency, formatDate, daysSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default function Home() {
  const stats = getDashboardStats();
  const maxStatusCount = Math.max(1, ...STATUSES.map((s) => stats.byStatus[s]));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of IT procurement requests from scope review to invoice.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Requests" value={String(stats.totalCount)} />
        <SummaryCard
          label="Active Requests"
          value={String(stats.activeRequests.length)}
        />
        <SummaryCard
          label="Total PO Value"
          value={formatCurrency(stats.totalPOAmount)}
        />
        <SummaryCard
          label="Total Invoiced"
          value={formatCurrency(stats.totalInvoicedAmount)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Requests by status
          </h2>
          <div className="mt-4 space-y-3">
            {STATUSES.map((status) => {
              const count = stats.byStatus[status];
              const widthPct = (count / maxStatusCount) * 100;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-medium text-slate-600">
                    {STATUS_LABELS[status]}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-800"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-sm font-semibold text-amber-900">
            Needs attention ({stats.staleRequests.length})
          </h2>
          <p className="mt-1 text-xs text-amber-700">
            Active requests not updated in 14+ days.
          </p>
          <ul className="mt-4 space-y-3">
            {stats.staleRequests.length === 0 && (
              <li className="text-sm text-amber-700">All caught up.</li>
            )}
            {stats.staleRequests.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/requests/${r.id}`}
                  className="block rounded-md bg-white p-3 hover:bg-amber-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">
                      {r.title}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {daysSince(r.updatedAt)} days since last update
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent activity
          </h2>
          <Link
            href="/requests"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            View all →
          </Link>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {stats.activeRequests.slice(0, 6).map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.id}`}
              className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{r.title}</p>
                <p className="text-xs text-slate-500">
                  {r.project} · {r.department}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">
                  Updated {formatDate(r.updatedAt)}
                </span>
                <StatusBadge status={r.status} />
              </div>
            </Link>
          ))}
          {stats.activeRequests.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              No active requests yet.{" "}
              <Link href="/requests/new" className="font-medium text-slate-900">
                Create one
              </Link>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
