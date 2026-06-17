"use client";

import { Suspense, useCallback, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { FileText, Plus, Search } from "lucide-react";
import { quotesApi, type Quote } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { CreateQuoteSheet } from "@/components/sales/quotes/CreateQuoteSheet";
import { QuoteDetailSheet } from "@/components/sales/quotes/QuoteDetailSheet";
import { useSheetQuery } from "@/hooks/use-sheet-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { ListPageLayout } from "@/components/shared/list-page-layout";
import { EmptyState } from "@/components/shared/empty-state";

function QuotesPageContent() {
  const { user, can } = useAuth();
  const isAdmin = useIsAdmin();
  const canCreate = can("quotes:manage") || isAdmin;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sheet = useSheetQuery();

  const { data, isLoading, mutate } = useSWR(
    user ? ["quotes", statusFilter, search] : null,
    () =>
      quotesApi.list({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search || undefined,
        limit: 50,
      }),
  );

  const quotes: Quote[] = Array.isArray(data) ? data : (data as { data?: Quote[] })?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  return (
    <>
      <ListPageLayout
        title="Quotes"
        description="Manage sales quotes and proposals"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Quotes" },
        ]}
        icon={<FileText className="h-4 w-4" />}
        actions={
          canCreate ? (
            <Button onClick={sheet.openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Quote
            </Button>
          ) : undefined
        }
        filters={
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search quotes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12 opacity-50" />}
            title="No quotes found"
            actionLabel={canCreate ? "Create your first quote" : undefined}
            onAction={canCreate ? sheet.openCreate : undefined}
          />
        ) : (
          <div className="rounded-xl ring-1 ring-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow
                    key={quote.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => sheet.openDetail(quote.id)}
                  >
                    <TableCell className="font-medium">{quote.quote_number}</TableCell>
                    <TableCell>{quote.client_name}</TableCell>
                    <TableCell>
                      {quote.quote_date
                        ? format(new Date(quote.quote_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>${quote.total_amount?.toFixed(2) ?? "0.00"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {quote.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ListPageLayout>

      {canCreate && (
        <CreateQuoteSheet
          open={sheet.createOpen}
          onOpenChange={(open) => (open ? sheet.openCreate() : sheet.closeCreate())}
          onCreated={(id) => {
            mutate();
            sheet.openDetail(id);
          }}
        />
      )}

      <QuoteDetailSheet
        quoteId={sheet.selectedId}
        open={Boolean(sheet.selectedId)}
        onOpenChange={(open) => !open && sheet.closeDetail()}
        onUpdated={() => mutate()}
      />
    </>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <QuotesPageContent />
    </Suspense>
  );
}
