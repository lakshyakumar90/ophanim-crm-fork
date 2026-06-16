export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}
