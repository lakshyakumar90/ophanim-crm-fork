"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Filter } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

interface SearchResult {
  type: "lead" | "task" | "invoice" | "expense" | "user";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, any>;
}

export function GlobalSearch() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ q: query });
        if (typeFilter !== "all") queryParams.append("type", typeFilter);
        if (durationFilter !== "all")
          queryParams.append("duration", durationFilter);

        const { data } = await api.get(`/search?${queryParams.toString()}`);
        setResults(data.data || []);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, typeFilter, durationFilter]);

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  const grouped = results.reduce(
    (acc, result) => {
      const type = result.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] border-border bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-1/2"
        onClick={() => setOpen(true)}
      >
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.44rem] hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b border-border px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 border-b border-border bg-muted/30 p-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {/* Hide Leads/Tasks for Finance Employees */}
              {!(
                user?.departmentSlug === "finance" && user?.role === "employee"
              ) && (
                <>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                </>
              )}
              <SelectItem value="invoice">Invoices</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              {(user?.role === "admin" || user?.role === "manager") && (
                <SelectItem value="user">Users</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Select value={durationFilter} onValueChange={setDurationFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="half_year">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <CommandGroup
                heading={type.charAt(0).toUpperCase() + type.slice(1) + "s"}
              >
                {items.map((item) => (
                  <CommandItem
                    key={`${item.type}-${item.id}`}
                    value={`${item.title} ${item.subtitle || ""}`}
                    onSelect={() => handleSelect(item.url)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
