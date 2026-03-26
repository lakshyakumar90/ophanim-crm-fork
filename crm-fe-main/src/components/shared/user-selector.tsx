"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface UserOption {
  id: string;
  fullName?: string;
  full_name?: string;
  email?: string;
  role?: string;
  departmentName?: string;
  jobTitle?: string;
  isActive?: boolean;
  is_active?: boolean;
}

interface UserSelectorProps {
  users: UserOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  excludeUserId?: string | null;
  disabled?: boolean;
  className?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export function UserSelector({
  users,
  value,
  onValueChange,
  placeholder = "Select a user...",
  excludeUserId,
  disabled = false,
  className,
  showAllOption = false,
  allOptionLabel = "All Users",
}: UserSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Filter out excluded user and inactive users, then apply search
  const filteredUsers = React.useMemo(() => {
    const activeUsers = users.filter(
      (u) =>
        u.id !== excludeUserId &&
        u.isActive !== false &&
        u.is_active !== false,
    );

    // Apply search filter
    if (!search) return activeUsers;

    const searchLower = search.toLowerCase();
    return activeUsers.filter((u) => {
      const name = (u.fullName || u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower);
    });
  }, [users, excludeUserId, search]);

  // Find selected user
  const selectedUser = users.find((u) => u.id === value);
  const displayName = selectedUser
    ? selectedUser.fullName || selectedUser.full_name || "Unknown"
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {displayName ? (
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {displayName}
              {selectedUser?.role && (
                <span className="text-xs text-muted-foreground">
                  ({selectedUser.role})
                </span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search users by name or email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList
            className="max-h-[250px] overflow-y-auto pointer-events-auto"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {showAllOption && (
                <CommandItem
                  value={allOptionLabel}
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === "" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{allOptionLabel}</span>
                    <span className="text-xs text-muted-foreground">No user filter applied</span>
                  </div>
                </CommandItem>
              )}
              {filteredUsers.map((user) => {
                const name = user.fullName || user.full_name || "Unknown";
                return (
                  <CommandItem
                    key={user.id}
                    value={`${name} ${user.email || ""}`}
                    onSelect={() => {
                      onValueChange(user.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === user.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          user.email || "No email",
                          user.role || user.jobTitle || null,
                          user.departmentName || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
