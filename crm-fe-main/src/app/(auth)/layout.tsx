export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-muted/40 [mask-image:linear-gradient(180deg,black,transparent)]" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30 [mask-image:linear-gradient(180deg,black,transparent)]" />
      <div className="relative z-10 w-full max-w-md px-4">{children}</div>
    </div>
  );
}
