"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { FolderKanban, FileText, Sparkles, Loader2 } from "lucide-react";
import { leadsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Lead } from "@/types";

interface LeadConversionPanelProps {
  lead: Lead;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConverted?: () => void;
}

export function LeadConversionPanel({
  lead,
  open: controlledOpen,
  onOpenChange,
  onConverted,
}: LeadConversionPanelProps) {
  const { can } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [createProject, setCreateProject] = useState(true);
  const [createInvoice, setCreateInvoice] = useState(true);
  const [notifyFinance, setNotifyFinance] = useState(true);
  const [notifyPM, setNotifyPM] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: status, mutate } = useSWR(
    lead.status === "won" ? `lead-conversion-${lead.id}` : null,
    () => leadsApi.getConversionStatus(lead.id),
  );

  if (lead.status !== "won") return null;

  const canConvert = can("leads:convert");
  const hasLinks = status?.project || status?.invoice;

  const handleConvert = async () => {
    if (!createProject && !createInvoice) {
      toast.error("Select at least one conversion action");
      return;
    }
    setSubmitting(true);
    try {
      await leadsApi.convert(lead.id, {
        createProject,
        createInvoice,
        notifyFinance,
        notifyPM,
        project: createProject
          ? {
              name: lead.businessName || lead.leadName,
              clientName: lead.businessName || lead.leadName,
            }
          : undefined,
      });
      toast.success("Lead converted successfully");
      await mutate();
      onConverted?.();
      setOpen(false);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Conversion failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
          <Sparkles className="h-4 w-4" />
          Deal conversion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasLinks ? (
          <div className="flex flex-wrap gap-3 text-sm">
            {status?.project && (
              <Link
                href={`/projects/${status.project.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                Project: {status.project.name}
              </Link>
            )}
            {status?.invoice && (
              <Link
                href={`/finance/invoices/${status.invoice.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
              >
                <FileText className="h-3.5 w-3.5" />
                Invoice: {status.invoice.clientName}
              </Link>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This lead is won. Create a linked project and/or invoice to hand off to delivery and finance.
          </p>
        )}

        {canConvert && (
          <Button size="sm" onClick={() => setOpen(true)}>
            {hasLinks ? "Convert more" : "Convert deal"}
          </Button>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert won lead</DialogTitle>
              <DialogDescription>
                Create downstream records for {lead.leadName}. Existing links are skipped automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-project"
                  checked={createProject}
                  onCheckedChange={(v) => setCreateProject(Boolean(v))}
                />
                <Label htmlFor="create-project">Create project</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-invoice"
                  checked={createInvoice}
                  onCheckedChange={(v) => setCreateInvoice(Boolean(v))}
                />
                <Label htmlFor="create-invoice">Create invoice</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-finance"
                  checked={notifyFinance}
                  onCheckedChange={(v) => setNotifyFinance(Boolean(v))}
                />
                <Label htmlFor="notify-finance">Notify finance team</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-pm"
                  checked={notifyPM}
                  onCheckedChange={(v) => setNotifyPM(Boolean(v))}
                />
                <Label htmlFor="notify-pm">Notify project manager</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConvert} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Convert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
