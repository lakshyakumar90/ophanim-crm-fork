export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">Page Not Found</h2>
      <p className="text-slate-500 max-w-md mx-auto">
        The page you are looking for does not exist or may have been moved.
      </p>
    </div>
  );
}
