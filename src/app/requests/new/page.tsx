import { RequestForm } from "@/components/RequestForm";

export default function NewRequestPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          New Procurement Request
        </h1>
        <p className="text-sm text-slate-500">
          Capture a new request starting from scope review.
        </p>
      </div>
      <RequestForm />
    </div>
  );
}
