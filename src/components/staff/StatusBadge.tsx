export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Completed"
      ? "bg-success text-success-foreground"
      : status === "Reviewed"
        ? "bg-gold-soft text-accent-foreground"
        : "bg-muted text-muted-foreground border";
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}
