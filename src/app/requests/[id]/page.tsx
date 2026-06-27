import { notFound } from "next/navigation";
import { getRequestById } from "@/lib/repository";
import { RequestForm } from "@/components/RequestForm";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = getRequestById(id);
  if (!request) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {request.title}
        </h1>
        <p className="text-sm text-slate-500">
          {request.project} · {request.department}
        </p>
      </div>
      <RequestForm initialData={request} />
    </div>
  );
}
