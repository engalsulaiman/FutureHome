import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Procurement Dashboard
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            Dashboard
          </Link>
          <Link href="/requests" className="hover:text-slate-900">
            Requests
          </Link>
          <Link
            href="/requests/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
          >
            + New Request
          </Link>
        </nav>
      </div>
    </header>
  );
}
