import { createServerFn } from "@tanstack/react-start";
import {
  COUNTRIES,
  IMAGE_TYPES,
  INTERESTS,
  MAX_IMAGE_BYTES,
  isPlausiblePhone,
  isValidEmail,
} from "./staff-options";

type Parsed = {
  full_name: string;
  position: string;
  phone: string;
  email: string;
  countries: string[];
  about_me: string | null;
  years: number | null;
  quote: string | null;
  interests: string[];
  other: string | null;
  background: File | null;
  profile: File | null;
};

function str(fd: FormData, key: string, max: number): string {
  const v = fd.get(key);
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function fileOf(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  if (!v || typeof v === "string") return null;
  const f = v as File;
  return f.size > 0 ? f : null;
}

function parse(fd: FormData): Parsed {
  const full_name = str(fd, "full_name", 120);
  const position = str(fd, "position", 120);
  const phone = str(fd, "phone", 30);
  const email = str(fd, "email", 255);
  if (!full_name) throw new Error("Please enter your full name.");
  if (!position) throw new Error("Please enter your position or role.");
  if (!isPlausiblePhone(phone)) throw new Error("Please enter a valid phone number.");
  if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");

  const countrySet = new Set<string>(COUNTRIES);
  const countries = [...new Set(fd.getAll("countries").map(String))].filter((c) => countrySet.has(c));
  const interestSet = new Set<string>(INTERESTS);
  const interests = [...new Set(fd.getAll("interests").map(String))].filter((c) => interestSet.has(c));

  const yearsRaw = str(fd, "years_of_experience", 3);
  let years: number | null = null;
  if (yearsRaw !== "") {
    years = Number(yearsRaw);
    if (!Number.isInteger(years) || years < 0 || years > 80)
      throw new Error("Years of experience must be a whole number from 0 to 80.");
  }
  const otherRaw = str(fd, "beyond_travels_other", 300);

  return {
    full_name,
    position,
    phone,
    email,
    countries,
    about_me: str(fd, "about_me", 2000) || null,
    years,
    quote: str(fd, "quote", 500) || null,
    interests,
    other: interests.includes("Other") && otherRaw ? otherRaw : null,
    background: fileOf(fd, "background_image"),
    profile: fileOf(fd, "profile_image"),
  };
}

async function checkImage(file: File, label: string): Promise<{ bytes: Uint8Array; ext: string; type: string }> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${label} must be smaller than 8 MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const b = bytes;
  let type = "";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) type = "image/jpeg";
  else if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) type = "image/png";
  else if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    type = "image/webp";
  if (!(IMAGE_TYPES as readonly string[]).includes(type))
    throw new Error(`${label} must be a JPG, PNG or WebP image.`);
  const ext = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
  return { bytes, ext, type };
}

export const submitStaffDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Invalid submission.");
    return data;
  })
  .handler(async ({ data }) => {
    let p: Parsed;
    try {
      p = parse(data);
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = crypto.randomUUID();
    const uploaded: string[] = [];

    try {
      const paths: { background: string | null; profile: string | null } = { background: null, profile: null };
      for (const [key, file, label] of [
        ["background", p.background, "Background image"],
        ["profile", p.profile, "Profile image"],
      ] as const) {
        if (!file) continue;
        const img = await checkImage(file, label);
        const path = `${id}/${key}.${img.ext}`;
        const { error } = await supabaseAdmin.storage
          .from("staff-images")
          .upload(path, img.bytes, { contentType: img.type, upsert: false });
        if (error) throw new Error(`We couldn't upload your ${label.toLowerCase()}. Please try again.`);
        uploaded.push(path);
        paths[key] = path;
      }

      const { error } = await supabaseAdmin.from("staff_submissions").insert({
        id,
        full_name: p.full_name,
        position: p.position,
        phone: p.phone,
        email: p.email,
        background_image_path: paths.background,
        profile_image_path: paths.profile,
        countries_of_specialisation: p.countries,
        about_me: p.about_me,
        years_of_experience: p.years,
        quote: p.quote,
        beyond_travels_interests: p.interests,
        beyond_travels_other: p.other,
      });
      if (error) {
        console.error("insert failed", error);
        throw new Error("We couldn't save your details. Please try again.");
      }
      return { ok: true as const };
    } catch (e) {
      if (uploaded.length) await supabaseAdmin.storage.from("staff-images").remove(uploaded);
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      return { ok: false as const, error: msg };
    }
  });
