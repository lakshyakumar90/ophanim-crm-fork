"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { Check, Send } from "lucide-react";
import { quotesApi, type Quote } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export function QuoteDetailSheet({
  quoteId,
  open,
  onOpenChange,
  onUpdated,
}: {
  quoteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const { user, can } = useAuth();

  const { data: quote, isLoading, mutate } = useSWR<Quote>(
    user && quoteId && open ? ["quote", quoteId] : null,
    () => quotesApi.get(quoteId!),
  );

  const refresh = async () => {
    await mutate();
    onUpdated?.();
  };

  const handleSend = async () => {
    if (!quoteId) return;
    try {
      await quotesApi.send(quoteId);
      toast.success("Quote sent");
      refresh();
    } catch {
      toast.error("Failed to send quote");
    }
  };

  const handleAccept = async () => {
    if (!quoteId) return;
    try {
      await quotesApi.accept(quoteId);
      toast.success("Quote accepted");
      refresh();
    } catch {
      toast.error("Failed to accept quote");
    }
  };

  const lineItems = quote?.line_items ?? [];

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={quote?.quote_number || "Quote"}
      description={quote?.client_name}
      size="lg"
      footer={
        quote ? (
          <div className="flex justify-end gap-2">
            {can("quotes:send") && quote.status === "draft" && (
              <Button variant="outline" onClick={handleSend}>
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            )}
            {can("quotes:approve") && quote.status === "sent" && (
              <Button onClick={handleAccept}>
                <Check className="mr-2 h-4 w-4" />
                Accept
              </Button>
            )}
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !quote ? (
        <p className="text-muted-foreground text-sm">Quote not found.</p>
      ) : (
        <div className="space-y-5">
          <Badge variant="outline" className="capitalize">
            {quote.status.replace(/_/g, " ")}
          </Badge>

          <div className="text-sm space-y-1">
            <p className="font-medium">{quote.client_name}</p>
            <p className="text-muted-foreground">{quote.client_email}</p>
            <p className="text-muted-foreground">
              {quote.quote_date
                ? format(new Date(quote.quote_date), "MMM d, yyyy")
                : "—"}
            </p>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, i) => (
                  <TableRow key={item.id ?? i}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      ${(item.total ?? item.quantity * (item.unitPrice ?? 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-right text-sm">
            <p className="text-lg font-bold">
              Total: ${quote.total_amount?.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </FormSideSheet>
  );
}
