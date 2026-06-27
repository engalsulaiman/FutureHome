import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import {
  DashboardStats,
  ProcurementRequest,
  ProcurementRequestInput,
  RequestStatus,
  STATUSES,
} from "./types";

function toPlainRequest(row: unknown): ProcurementRequest {
  return { ...(row as ProcurementRequest) };
}

export function listRequests(): ProcurementRequest[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM requests ORDER BY updatedAt DESC").all();
  return rows.map(toPlainRequest);
}

export function getRequestById(id: string): ProcurementRequest | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(id);
  return row ? toPlainRequest(row) : undefined;
}

export function createRequest(input: ProcurementRequestInput): ProcurementRequest {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO requests (
      id, title, project, department, requestedBy, vendor, description, status,
      prNumber, prDate, poNumber, poDate, poAmount, currency,
      invoiceNumber, invoiceDate, invoiceAmount, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.title,
    input.project,
    input.department,
    input.requestedBy,
    input.vendor ?? null,
    input.description ?? null,
    input.status,
    input.prNumber ?? null,
    input.prDate ?? null,
    input.poNumber ?? null,
    input.poDate ?? null,
    input.poAmount ?? null,
    input.currency ?? "USD",
    input.invoiceNumber ?? null,
    input.invoiceDate ?? null,
    input.invoiceAmount ?? null,
    input.notes ?? null,
    now,
    now
  );
  return getRequestById(id)!;
}

export function updateRequest(
  id: string,
  input: ProcurementRequestInput
): ProcurementRequest | undefined {
  const db = getDb();
  const existing = getRequestById(id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE requests SET
      title = ?, project = ?, department = ?, requestedBy = ?, vendor = ?, description = ?, status = ?,
      prNumber = ?, prDate = ?, poNumber = ?, poDate = ?, poAmount = ?, currency = ?,
      invoiceNumber = ?, invoiceDate = ?, invoiceAmount = ?, notes = ?, updatedAt = ?
    WHERE id = ?`
  ).run(
    input.title,
    input.project,
    input.department,
    input.requestedBy,
    input.vendor ?? null,
    input.description ?? null,
    input.status,
    input.prNumber ?? null,
    input.prDate ?? null,
    input.poNumber ?? null,
    input.poDate ?? null,
    input.poAmount ?? null,
    input.currency ?? "USD",
    input.invoiceNumber ?? null,
    input.invoiceDate ?? null,
    input.invoiceAmount ?? null,
    input.notes ?? null,
    now,
    id
  );
  return getRequestById(id);
}

export function deleteRequest(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM requests WHERE id = ?").run(id);
  return Number(result.changes) > 0;
}

export function getDashboardStats(): DashboardStats {
  const all = listRequests();
  const byStatus = STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<RequestStatus, number>);

  let totalPOAmount = 0;
  let totalInvoicedAmount = 0;
  for (const request of all) {
    byStatus[request.status] += 1;
    if (request.poAmount) totalPOAmount += request.poAmount;
    if (request.invoiceAmount) totalInvoicedAmount += request.invoiceAmount;
  }

  const activeRequests = all.filter((r) => r.status !== "CLOSED");
  const STALE_DAYS = 14;
  const staleCutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  const staleRequests = activeRequests.filter(
    (r) => new Date(r.updatedAt).getTime() < staleCutoff
  );

  return {
    totalCount: all.length,
    byStatus,
    totalPOAmount,
    totalInvoicedAmount,
    activeRequests,
    staleRequests,
  };
}
