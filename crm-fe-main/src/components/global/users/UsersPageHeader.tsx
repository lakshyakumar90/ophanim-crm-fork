import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type UsersPageHeaderProps = {
  onAddUser: () => void;
};

export function UsersPageHeader({ onAddUser }: UsersPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage users and their roles</p>
      </div>
      <Button onClick={onAddUser} size="lg" className="h-11 rounded-xl px-5 shadow-sm">
        <Plus className="mr-2 h-4 w-4" /> Add User
      </Button>
    </div>
  );
}
