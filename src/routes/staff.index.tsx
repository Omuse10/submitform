import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, LogOut, Search, User } from "lucide-react";
import { getStaffSession, listSubmissions, staffLogout } from "@/lib/admin.functions";
import { STATUSES } from "@/lib/staff-options";
import { StatusBadge } from "@/components/staff/StatusBadge";

export const Route = createFileRoute("/staff/")({
  beforeLoad: async () => {
    const s = await getStaffSession();
    if (!s.admin) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "tapp Staff Area" },
      { name: "description", content: "Private tapp staff area." },
      { property: "og:title", content: "tapp Staff Area" },
      { property: "og:description", content: "Private tapp staff area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffList,
});

export function useLogout() {
  const logout = useServerFn(staffLogout);
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await logout();
    qc.clear();
    navigate({ to: "/", replace: true });
  };
}

function StaffList() {
  const list = useServerFn(listSubmissions);
  const { data, isLoading, error } = useQuery({ queryKey: ["submissions"], queryFn: () => list() });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("All");
  const logout = useLogout();

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter(
      (r) =>
        (status === "All" || r.status === status) &&
        (!s || [r.full_name, r.position, r.phone, r.email].some((v) => v.toLowerCase().includes(s))),
    );
  }, [data, q, status]);

  const pending = (data ?? []).filter((r) => r.status === "Pending").length;

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div className="min-w-0">
            <h1 className="font-sans text-2xl font-bold">tapp Staff Area</h1>
            <p className="text-sm opacity-70">Windsong Travels Submissions</p>
          </div>
          <button onClick={logout} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ink-foreground/20 px-3 py-2 text-sm hover:bg-ink-foreground/10">
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-xl bg-card p-4 shadow-soft">
            <p className="text-sm text-muted-foreground">Total submissions</p>
            <p className="text-3xl font-bold">{data?.length ?? "–"}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-soft">
            <p className="text-sm text-muted-foreground">Awaiting review</p>
            <p className="text-3xl font-bold">{data ? pending : "–"}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="field pl-10" placeholder="Search name, position, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="field sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option>All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-card shadow-soft">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <p className="p-8 text-center text-destructive">Could not load submissions. Please refresh.</p>
          ) : rows.length === 0 ? (
            <p className="p-12 text-center text-muted-foreground">{data?.length ? "No submissions match your search." : "No submissions yet."}</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link to="/staff/$id" params={{ id: r.id }} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 hover:bg-muted">
                    {r.profile_url ? (
                      <img src={r.profile_url} alt="" className="size-12 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-12 place-items-center rounded-full bg-muted"><User className="size-5 text-muted-foreground" /></span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.full_name} <span className="font-normal text-muted-foreground">· {r.position}</span></p>
                      <p className="truncate text-sm text-muted-foreground">{r.phone} · {r.email}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
