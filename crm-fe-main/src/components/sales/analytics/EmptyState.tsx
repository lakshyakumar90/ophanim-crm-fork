export function EmptyState({ message }: { message: string }) {
  return <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">{message}</div>;
}
