"use client";

export default function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">403</h1>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">
        Access Denied
      </h2>
      <p className="text-slate-500 max-w-md mx-auto">
        You do not have permission to access this resource. Please contact your
        system administrator if you believe this is an error.
      </p>
    </div>
  );
}
