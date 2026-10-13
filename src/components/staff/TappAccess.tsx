import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { staffLogin } from "@/lib/admin.functions";

const WINDOW_MS = 1500;

export function TappAccess() {
  const taps = useRef<number[]>([]);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useServerFn(staffLogin);
  const navigate = useNavigate();

  function tap(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      setError(null);
      setPw("");
      setOpen(true);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !pw) return;
    setBusy(true);
    setError(null);
    try {
      const res = await login({ data: { password: pw } });
      if (res.ok) {
        setOpen(false);
        await navigate({ to: "/staff" });
      } else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={tap} className="select-none px-3 py-2 text-xs tracking-wide text-muted-foreground/70">
        Powered by <span className="font-semibold">tapp</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-sans text-xl">tapp Staff Access</DialogTitle>
            <DialogDescription>Authorised tapp staff only.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                aria-label="Password"
                placeholder="Password"
                className="field pr-12"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={busy || !pw}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Enter Staff Area
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
