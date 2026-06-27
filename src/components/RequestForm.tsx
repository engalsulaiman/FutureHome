"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ProcurementRequest,
  RequestStatus,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/types";

interface RequestFormProps {
  initialData?: ProcurementRequest;
}

type FormState = {
  title: string;
  project: string;
  department: string;
  requestedBy: string;
  vendor: string;
  description: string;
  status: RequestStatus;
  prNumber: string;
  prDate: string;
  poNumber: string;
  poDate: string;
  poAmount: string;
  currency: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: string;
  notes: string;
};

function toFormState(data?: ProcurementRequest): FormState {
  return {
    title: data?.title ?? "",
    project: data?.project ?? "",
    department: data?.department ?? "",
    requestedBy: data?.requestedBy ?? "",
    vendor: data?.vendor ?? "",
    description: data?.description ?? "",
    status: data?.status ?? "SCOPE_REVIEW",
    prNumber: data?.prNumber ?? "",
    prDate: data?.prDate ?? "",
    poNumber: data?.poNumber ?? "",
    poDate: data?.poDate ?? "",
    poAmount: data?.poAmount?.toString() ?? "",
    currency: data?.currency ?? "USD",
    invoiceNumber: data?.invoiceNumber ?? "",
    invoiceDate: data?.invoiceDate ?? "",
    invoiceAmount: data?.invoiceAmount?.toString() ?? "",
    notes: data?.notes ?? "",
  };
}

export function RequestForm({ initialData }: RequestFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState<FormState>(toFormState(initialData));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        poAmount: form.poAmount ? Number(form.poAmount) : null,
        invoiceAmount: form.invoiceAmount ? Number(form.invoiceAmount) : null,
      };
      const url = isEdit ? `/api/requests/${initialData!.id}` : "/api/requests";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Something went wrong.");
      }
      const saved = await res.json();
      router.push(`/requests/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialData) return;
    if (!window.confirm("Delete this procurement request? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/requests/${initialData.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete.");
      router.push("/requests");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Section title="Request details">
        <Field label="Title" required>
          <input
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Status" required>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as RequestStatus)}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project" required>
          <input
            required
            value={form.project}
            onChange={(e) => update("project", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Department" required>
          <input
            required
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Requested by" required>
          <input
            required
            value={form.requestedBy}
            onChange={(e) => update("requestedBy", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Vendor">
          <input
            value={form.vendor}
            onChange={(e) => update("vendor", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Description" full>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Purchase request">
        <Field label="PR number">
          <input
            value={form.prNumber}
            onChange={(e) => update("prNumber", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="PR date">
          <input
            type="date"
            value={form.prDate}
            onChange={(e) => update("prDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Purchase order">
        <Field label="PO number">
          <input
            value={form.poNumber}
            onChange={(e) => update("poNumber", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="PO date">
          <input
            type="date"
            value={form.poDate}
            onChange={(e) => update("poDate", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="PO amount">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.poAmount}
            onChange={(e) => update("poAmount", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Currency">
          <input
            value={form.currency}
            onChange={(e) => update("currency", e.target.value.toUpperCase())}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Invoice">
        <Field label="Invoice number">
          <input
            value={form.invoiceNumber}
            onChange={(e) => update("invoiceNumber", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Invoice date">
          <input
            type="date"
            value={form.invoiceDate}
            onChange={(e) => update("invoiceDate", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Invoice amount">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.invoiceAmount}
            onChange={(e) => update("invoiceAmount", e.target.value)}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Notes">
        <Field label="Notes" full>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>
      </Section>

      <div className="flex items-center justify-between border-t border-slate-200 pt-6">
        <div>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete request"}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create request"}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
