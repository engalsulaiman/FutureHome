import { listRequests } from "@/lib/repository";
import { RequestsTable } from "@/components/RequestsTable";

export const dynamic = "force-dynamic";

export default function RequestsPage() {
  const requests = listRequests();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Procurement Requests
        </h1>
        <p className="text-sm text-slate-500">
          All requests tracked from scope review through invoicing.
        </p>
      </div>
      <RequestsTable requests={requests} />
    </div>
  );
}
