import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, useSession } from "@tanstack/react-start/server";
import { STATUSES, type SubmissionStatus } from "./staff-options";

type AdminSession = { admin?: boolean; at?: number };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "tapp-staff",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

async function sha256(input: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
}

async function passwordMatches(input: string, expected: string) {
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function isAdmin() {
  const s = await useSession<AdminSession>(sessionConfig());
  return s.data.admin === true;
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MIN = 15;

export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => ({ password: String(d?.password ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    const expected = process.env["TAPP_STAFF_PASSWORD"];
    if (!expected) return { ok: false as const, error: "Staff access is not configured." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const ipHash = Array.from(await sha256(`${ip}:${process.env["SESSION_SECRET"]}`))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_ATTEMPTS)
      return { ok: false as const, error: `Too many attempts. Please wait ${WINDOW_MIN} minutes and try again.` };

    if (!(await passwordMatches(data.password, expected))) {
      await supabaseAdmin.from("admin_login_attempts").insert({ ip_hash: ipHash });
      return { ok: false as const, error: "Incorrect password. Please try again." };
    }
    await supabaseAdmin.from("admin_login_attempts").delete().eq("ip_hash", ipHash);
    const s = await useSession<AdminSession>(sessionConfig());
    await s.update({ admin: true, at: Date.now() });
    return { ok: true as const };
  });

export const staffLogout = createServerFn({ method: "POST" }).handler(async () => {
  const s = await useSession<AdminSession>(sessionConfig());
  await s.clear();
  return { ok: true };
});

export const getStaffSession = createServerFn({ method: "GET" }).handler(async () => ({
  admin: await isAdmin(),
}));

export type SubmissionRow = {
  id: string;
  full_name: string;
  position: string;
  phone: string;
  email: string;
  status: SubmissionStatus;
  created_at: string;
  profile_url: string | null;
};

export const listSubmissions = createServerFn({ method: "GET" }).handler(async () => {
  const db = await requireAdmin();
  const { data, error } = await db
    .from("staff_submissions")
    .select("id, full_name, position, phone, email, status, created_at, profile_image_path")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load submissions.");
  const paths = data.map((r) => r.profile_image_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await db.storage.from("staff-images").createSignedUrls(paths, 3600);
    signed?.forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  return data.map(
    (r): SubmissionRow => ({
      id: r.id,
      full_name: r.full_name,
      position: r.position,
      phone: r.phone,
      email: r.email,
      status: r.status as SubmissionStatus,
      created_at: r.created_at,
      profile_url: r.profile_image_path ? urls.get(r.profile_image_path) ?? null : null,
    }),
  );
});

async function signedPair(db: Awaited<ReturnType<typeof requireAdmin>>, path: string | null, name: string) {
  if (!path) return null;
  const bucket = db.storage.from("staff-images");
  const ext = path.split(".").pop();
  const [view, dl] = await Promise.all([
    bucket.createSignedUrl(path, 3600),
    bucket.createSignedUrl(path, 3600, { download: `${name}.${ext}` }),
  ]);
  if (!view.data) return null;
  return { view: view.data.signedUrl, download: dl.data?.signedUrl ?? view.data.signedUrl };
}

export const getSubmission = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d?.id ?? "")) throw new Error("Invalid id");
    return d;
  })
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const { data: row, error } = await db.from("staff_submissions").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error("Could not load submission.");
    if (!row) return null;
    const slug = row.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "staff";
    const [background, profile] = await Promise.all([
      signedPair(db, row.background_image_path, `${slug}-background`),
      signedPair(db, row.profile_image_path, `${slug}-profile`),
    ]);
    return { ...row, status: row.status as SubmissionStatus, background, profile };
  });

export const updateSubmissionStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: SubmissionStatus }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d?.id ?? "")) throw new Error("Invalid id");
    if (!STATUSES.includes(d.status)) throw new Error("Invalid status");
    return d;
  })
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const { error } = await db.from("staff_submissions").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Could not update status.");
    return { ok: true };
  });
