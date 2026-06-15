import { ShieldAlert } from "lucide-react";

export function UsersAccessDenied() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}
