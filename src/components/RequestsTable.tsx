"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProcurementRequest, STATUSES, STATUS_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export function RequestsTable({ requests }: { requests: ProcurementRequest[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!term) return true;
      return (
        r.title.toLowerCase().includes(term) ||
        r.project.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term) ||
        r.requestedBy.toLowerCase().includes(term) ||
        (r.vendor ?? "").toLowerCase().includes(term) ||
        (r.prNumber ?? "").toLowerCase().includes(term) ||
        (r.poNumber ?? "").toLowerCase().includes(term)
      );
    });
  }, [requests, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by title, project, vendor, PR/PO number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {filtered.length} of {requests.length} requests
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <Th>Title</Th>
              <Th>Project</Th>
              <Th>Department</Th>
              <Th>Status</Th>
              <Th>PO Amount</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/requests/${r.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <p className="text-xs text-slate-500">{r.requestedBy}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.project}</td>
                <td className="px-4 py-3 text-slate-700">{r.department}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatCurrency(r.poAmount, r.currency)}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDate(r.updatedAt)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No requests match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}
