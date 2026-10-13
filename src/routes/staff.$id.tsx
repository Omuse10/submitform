import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Download, ExternalLink, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { getStaffSession, getSubmission, updateSubmissionStatus } from "@/lib/admin.functions";
import { STATUSES, type SubmissionStatus } from "@/lib/staff-options";
import { StatusBadge } from "@/components/staff/StatusBadge";
import { useLogout } from "./staff.index";

export const Route = createFileRoute("/staff/$id")({
  beforeLoad: async () => {
    const s = await getStaffSession();
    if (!s.admin) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Submission — tapp Staff Area" },
      { name: "description", content: "Private staff submission details." },
      { property: "og:title", content: "Submission — tapp Staff Area" },
      { property: "og:description", content: "Private staff submission details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Detail,
});

function copy(text: string, what: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${what} copied`),
    () => toast.error("Could not copy"),
  );
}

function Detail() {
  const { id } = Route.useParams();
  const get = useServerFn(getSubmission);
  const update = useServerFn(updateSubmissionStatus);
  const qc = useQueryClient();
  const logout = useLogout();
  const { data: s, isLoading } = useQuery({ queryKey: ["submission", id], queryFn: () => get({ data: { id } }) });

  async function setStatus(status: SubmissionStatus) {
    try {
      await update({ data: { id, status } });
      await Promise.all([qc.invalidateQueries({ queryKey: ["submission", id] }), qc.invalidateQueries({ queryKey: ["submissions"] })]);
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error("Could not update status");
    }
  }

  const interests = s
    ? [...s.beyond_travels_interests.filter((i) => i !== "Other"), ...(s.beyond_travels_other ? [`Other: ${s.beyond_travels_other}`] : [])]
    : [];
  const contact = s ? `${s.full_name}\n${s.position}\n${s.phone}\n${s.email}` : "";
  const allText = s
    ? [
        `Full Name: ${s.full_name}`,
        `Position or Role: ${s.position}`,
        `Phone Number: ${s.phone}`,
        `Email Address: ${s.email}`,
        `Countries You Specialise In: ${s.countries_of_specialisation.join(", ") || "—"}`,
        `About Me: ${s.about_me ?? "—"}`,
        `Years of Experience: ${s.years_of_experience ?? "—"}`,
        `My Quote: ${s.quote ?? "—"}`,
        `Beyond Travels: ${interests.join(", ") || "—"}`,
        `Status: ${s.status}`,
        `Submitted: ${new Date(s.created_at).toLocaleString()}`,
      ].join("\n")
    : "";

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/staff" className="inline-flex items-center gap-2 text-sm hover:opacity-80"><ArrowLeft className="size-4" /> All submissions</Link>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-ink-foreground/20 px-3 py-2 text-sm hover:bg-ink-foreground/10"><LogOut className="size-4" /> Log out</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-6">
        {isLoading ? (
          <div className="flex justify-center p-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : !s ? (
          <p className="rounded-xl bg-card p-10 text-center text-muted-foreground">Submission not found.</p>
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-xl bg-card shadow-soft">
              {s.background && <img src={s.background.view} alt="Background" className="aspect-[3/1] w-full object-cover" />}
              <div className="flex flex-wrap items-center gap-4 p-5">
                {s.profile && <img src={s.profile.view} alt="Profile" className="size-20 rounded-full border-4 border-card object-cover shadow-soft" />}
                <div className="min-w-0 flex-1">
                  <h1 className="font-sans text-2xl font-bold">{s.full_name}</h1>
                  <p className="text-muted-foreground">{s.position}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="flex flex-wrap gap-2 border-t p-4">
                {STATUSES.map((st) => (
                  <button key={st} onClick={() => setStatus(st)} disabled={s.status === st}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${s.status === st ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    Mark {st}
                  </button>
                ))}
                <span className="flex-1" />
                <button onClick={() => copy(contact, "Contact details")} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><Copy className="size-4" /> Copy contact</button>
                <button onClick={() => copy(allText, "All details")} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><Copy className="size-4" /> Copy all</button>
              </div>
            </section>

            <section className="grid gap-px overflow-hidden rounded-xl bg-border shadow-soft sm:grid-cols-2">
              <Item label="Full Name" value={s.full_name} />
              <Item label="Position or Role" value={s.position} />
              <Item label="Phone Number" value={s.phone} onCopy={() => copy(s.phone, "Phone")} />
              <Item label="Email Address" value={s.email} onCopy={() => copy(s.email, "Email")} />
              <Item label="Years of Experience" value={s.years_of_experience?.toString()} />
              <Item label="Submitted" value={`${new Date(s.created_at).toLocaleString()}${s.updated_at !== s.created_at ? ` · Updated ${new Date(s.updated_at).toLocaleString()}` : ""}`} />
              <Item wide label="Countries You Specialise In" value={s.countries_of_specialisation.join(", ")} />
              <Item wide label="About Me" value={s.about_me} />
              <Item wide label="My Quote" value={s.quote} />
              <Item wide label="Beyond Travels" value={interests.join(", ")} />
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <ImageCard label="Background Image" img={s.background} />
              <ImageCard label="Profile Image" img={s.profile} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Item({ label, value, wide, onCopy }: { label: string; value?: string | null | undefined; wide?: boolean | undefined; onCopy?: (() => void) | undefined }) {
  return (
    <div className={`bg-card p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{value || <span className="text-muted-foreground">—</span>}</p>
        {onCopy && <button onClick={onCopy} aria-label={`Copy ${label}`} className="rounded p-1 text-muted-foreground hover:bg-muted"><Copy className="size-4" /></button>}
      </div>
    </div>
  );
}

function ImageCard({ label, img }: { label: string; img: { view: string; download: string } | null }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-soft">
      <p className="mb-3 text-sm font-semibold">{label}</p>
      {img ? (
        <>
          <img src={img.view} alt={label} className="aspect-video w-full rounded-lg bg-muted object-contain" />
          <div className="mt-3 flex gap-2">
            <a href={img.view} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><ExternalLink className="size-4" /> Open</a>
            <a href={img.download} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><Download className="size-4" /> Download</a>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No image uploaded.</p>
      )}
    </div>
  );
}
