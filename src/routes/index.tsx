import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import logo from "@/assets/windsong-logo.webp";
import { ImageUpload } from "@/components/staff/ImageUpload";
import { CountryPicker } from "@/components/staff/CountryPicker";
import { TappAccess } from "@/components/staff/TappAccess";
import { submitStaffDetails } from "@/lib/submissions.functions";
import { INTERESTS, isPlausiblePhone, isValidEmail } from "@/lib/staff-options";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your Digital Business Card — Windsong Travels" },
      { name: "description", content: "Windsong Travels staff: submit your details for your digital business card." },
      { property: "og:title", content: "Your Digital Business Card — Windsong Travels" },
      { property: "og:description", content: "Submit your details for your Windsong Travels digital business card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Index,
});

type Errors = Partial<Record<"full_name" | "position" | "phone" | "email" | "years", string>>;

function Field({ label, hint, error, children, required }: { label: string; hint?: string | undefined; error?: string | undefined; children: React.ReactNode; required?: boolean | undefined }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-semibold">
        {label} {required && <span className="text-gold">*</span>}
      </span>
      {hint && <span className="mb-2.5 block text-sm text-muted-foreground">{hint}</span>}
      {children}
      {error && <span className="mt-1.5 block text-sm text-destructive">{error}</span>}
    </label>
  );
}

function Index() {
  const submit = useServerFn(submitStaffDetails);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [bg, setBg] = useState<File | null>(null);
  const [profile, setProfile] = useState<File | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busyRef.current) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    const errs: Errors = {};
    if (!g("full_name")) errs.full_name = "Please enter your full name.";
    if (!g("position")) errs.position = "Please enter your position or role.";
    if (!isPlausiblePhone(g("phone"))) errs.phone = "Please enter a valid phone number, including country code if outside Australia.";
    if (!isValidEmail(g("email"))) errs.email = "Please enter a valid email address.";
    const y = g("years_of_experience");
    if (y && (!/^\d+$/.test(y) || Number(y) > 80)) errs.years = "Please enter a whole number of years (0 or more).";
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Please check the highlighted fields.");
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }

    countries.forEach((c) => fd.append("countries", c));
    interests.forEach((c) => fd.append("interests", c));
    if (bg) fd.set("background_image", bg);
    if (profile) fd.set("profile_image", profile);

    busyRef.current = true;
    setBusy(true);
    setFormError(null);
    try {
      const res = await submit({ data: fd });
      if (res.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setFormError(res.error);
    } catch {
      setFormError("We couldn't submit your details. Please check your connection and try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-ink px-6 py-6">
        <img src={logo} alt="Windsong Travel" className="mx-auto h-14 w-auto sm:h-16" />
      </header>
      <div className="h-1 bg-gold-gradient" />

      <main className="mx-auto max-w-xl px-5 pb-10 pt-10 sm:pt-14">
        {done ? (
          <section className="rounded-2xl border bg-card p-8 text-center shadow-soft">
            <CheckCircle2 className="mx-auto size-14 text-gold" />
            <h1 className="mt-4 text-4xl font-semibold">Thank you!</h1>
            <p className="mt-3 text-muted-foreground">
              Your details have been submitted successfully. Your information will be used to prepare your Windsong Travels digital business card.
            </p>
          </section>
        ) : (
          <>
            <h1 className="text-center text-4xl font-semibold leading-tight sm:text-5xl">Your Digital Business Card</h1>
            <p className="mt-4 text-center leading-relaxed text-muted-foreground">
              Welcome to Windsong Travels. Please complete the form below with your personal and professional details. This information will be used to create your individual Windsong Travels digital business card. Please ensure your details are accurate and upload clear images.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-10 space-y-8 rounded-2xl border bg-card p-5 shadow-soft sm:p-8">
              <ImageUpload variant="wide" label="Background Image" hint="Choose a high-quality image that represents you or your travel style." file={bg} onChange={setBg} />
              <ImageUpload variant="round" label="Profile Image" hint="Use a clear photograph of yourself." file={profile} onChange={setProfile} />

              <Field label="Full Name" required error={errors.full_name}>
                <input name="full_name" className="field" autoComplete="name" maxLength={120} aria-invalid={!!errors.full_name} />
              </Field>
              <Field label="Position or Role" required error={errors.position}>
                <input name="position" className="field" placeholder="Travel Consultant" maxLength={120} aria-invalid={!!errors.position} />
              </Field>
              <Field label="Phone Number" required error={errors.phone}>
                <input name="phone" type="tel" inputMode="tel" className="field" autoComplete="tel" placeholder="+61 400 000 000" maxLength={30} aria-invalid={!!errors.phone} />
              </Field>
              <Field label="Email Address" required error={errors.email}>
                <input name="email" type="email" inputMode="email" className="field" autoComplete="email" maxLength={255} aria-invalid={!!errors.email} />
              </Field>

              <div>
                <span className="mb-1.5 block font-semibold">Countries You Specialise In</span>
                <p className="mb-3 text-sm text-muted-foreground">Select the countries you specialise in helping guests explore.</p>
                <CountryPicker value={countries} onChange={setCountries} />
              </div>

              <Field label="About Me" hint="Tell guests a little about yourself, your experience and what you enjoy about helping people travel.">
                <textarea name="about_me" rows={5} maxLength={2000} className="field resize-y" />
              </Field>
              <Field label="Years of Experience" error={errors.years}>
                <input name="years_of_experience" type="number" inputMode="numeric" min={0} max={80} step={1} className="field max-w-40" aria-invalid={!!errors.years} />
              </Field>
              <Field label="My Quote" hint="Share a favourite quote or personal motto.">
                <textarea name="quote" rows={2} maxLength={500} className="field resize-y" />
              </Field>

              <div>
                <span className="mb-1.5 block font-semibold">Beyond Travels</span>
                <p className="mb-3 text-sm text-muted-foreground">What do you enjoy doing outside of travel?</p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => {
                    const on = interests.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setInterests(on ? interests.filter((x) => x !== i) : [...interests, i])}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-gold"}`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
                {interests.includes("Other") && (
                  <input name="beyond_travels_other" className="field mt-3" maxLength={300} placeholder="Tell us your other interests" aria-label="Other interests" />
                )}
              </div>

              {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</p>}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-70"
              >
                {busy ? (<><Loader2 className="size-5 animate-spin" /> Submitting…</>) : "Submit My Details"}
              </button>
            </form>
          </>
        )}
      </main>
      <footer className="pb-8 text-center">
        <TappAccess />
      </footer>
    </div>
  );
}
