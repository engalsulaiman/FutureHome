import { ProcurementRequestInput, STATUSES } from "@/lib/types";

export function parseRequestInput(body: unknown): ProcurementRequestInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  if (typeof b.title !== "string" || !b.title.trim()) return null;
  if (typeof b.project !== "string" || !b.project.trim()) return null;
  if (typeof b.department !== "string" || !b.department.trim()) return null;
  if (typeof b.requestedBy !== "string" || !b.requestedBy.trim()) return null;
  if (typeof b.status !== "string" || !STATUSES.includes(b.status as never)) return null;

  const toStringOrNull = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const toNumberOrNull = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v)
      ? v
      : typeof v === "string" && v.trim() && !Number.isNaN(Number(v))
        ? Number(v)
        : null;

  return {
    title: b.title.trim(),
    project: b.project.trim(),
    department: b.department.trim(),
    requestedBy: b.requestedBy.trim(),
    vendor: toStringOrNull(b.vendor),
    description: toStringOrNull(b.description),
    status: b.status as ProcurementRequestInput["status"],
    prNumber: toStringOrNull(b.prNumber),
    prDate: toStringOrNull(b.prDate),
    poNumber: toStringOrNull(b.poNumber),
    poDate: toStringOrNull(b.poDate),
    poAmount: toNumberOrNull(b.poAmount),
    currency: toStringOrNull(b.currency) ?? "USD",
    invoiceNumber: toStringOrNull(b.invoiceNumber),
    invoiceDate: toStringOrNull(b.invoiceDate),
    invoiceAmount: toNumberOrNull(b.invoiceAmount),
    notes: toStringOrNull(b.notes),
  };
}
