export function SummaryBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-2 py-1 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
