export const STATUSES = [
  "SCOPE_REVIEW",
  "PR_CREATED",
  "PR_APPROVED",
  "PO_ISSUED",
  "INVOICED",
  "CLOSED",
] as const;

export type RequestStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  SCOPE_REVIEW: "Scope Review",
  PR_CREATED: "PR Created",
  PR_APPROVED: "PR Approved",
  PO_ISSUED: "PO Issued",
  INVOICED: "Invoiced",
  CLOSED: "Closed",
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  SCOPE_REVIEW: "bg-slate-200 text-slate-800",
  PR_CREATED: "bg-amber-100 text-amber-800",
  PR_APPROVED: "bg-blue-100 text-blue-800",
  PO_ISSUED: "bg-purple-100 text-purple-800",
  INVOICED: "bg-teal-100 text-teal-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};

export interface ProcurementRequest {
  id: string;
  title: string;
  project: string;
  department: string;
  requestedBy: string;
  vendor: string | null;
  description: string | null;
  status: RequestStatus;
  prNumber: string | null;
  prDate: string | null;
  poNumber: string | null;
  poDate: string | null;
  poAmount: number | null;
  currency: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementRequestInput {
  title: string;
  project: string;
  department: string;
  requestedBy: string;
  vendor?: string | null;
  description?: string | null;
  status: RequestStatus;
  prNumber?: string | null;
  prDate?: string | null;
  poNumber?: string | null;
  poDate?: string | null;
  poAmount?: number | null;
  currency?: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  invoiceAmount?: number | null;
  notes?: string | null;
}

export interface DashboardStats {
  totalCount: number;
  byStatus: Record<RequestStatus, number>;
  totalPOAmount: number;
  totalInvoicedAmount: number;
  activeRequests: ProcurementRequest[];
  staleRequests: ProcurementRequest[];
}
