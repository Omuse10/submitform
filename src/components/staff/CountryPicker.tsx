import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { COUNTRIES } from "@/lib/staff-options";

export function CountryPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return COUNTRIES.filter((c) => !s || c.toLowerCase().includes(s));
  }, [q]);

  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-gold-soft py-1 pl-3 pr-1 text-sm font-medium text-accent-foreground">
              {c}
              <button type="button" aria-label={`Remove ${c}`} onClick={() => toggle(c)} className="rounded-full p-1 hover:bg-card">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="field pl-10"
          placeholder="Search countries…"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        />
      </div>
      {open && (
        <div className="mt-2 rounded-xl border bg-card shadow-soft">
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox" aria-multiselectable>
            {results.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">No countries found</li>}
            {results.map((c) => {
              const on = value.includes(c);
              return (
                <li key={c}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(c)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[0.95rem] hover:bg-muted ${on ? "font-semibold" : ""}`}
                  >
                    {c}
                    {on && <Check className="size-4 text-gold" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t p-2 text-right">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-muted">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
