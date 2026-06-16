"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { quotesApi, leadsApi } from "@/lib/api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

type WonLead = {
  id: string;
  leadName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
};

function leadLabel(lead: WonLead) {
  const name = lead.leadName || lead.businessName || "Unnamed lead";
  return lead.businessName && lead.leadName
    ? `${lead.leadName} (${lead.businessName})`
    : name;
}

const defaultForm = () => ({
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  description: "",
  quantity: "1",
  unitPrice: "0",
});

export function CreateQuoteSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (quoteId: string) => void;
}) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [form, setForm] = useState(defaultForm);

  const { data: leadsData } = useSWR(
    user && open ? "won-leads-for-quote" : null,
    () =>
      leadsApi.list({
        status: "won",
        limit: 200,
        ...(isAdmin || isManager ? {} : { assignedTo: user?.id }),
      }),
  );

  const leads: WonLead[] = Array.isArray(leadsData)
    ? leadsData
    : (leadsData as { data?: WonLead[] })?.data ?? [];

  useEffect(() => {
    if (!open) return;
    setLeadId("");
    setForm(defaultForm());
  }, [open]);

  const handleLeadSelect = (id: string) => {
    setLeadId(id);
    if (!id || id === "none") return;
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      setForm((prev) => ({
        ...prev,
        clientName: lead.leadName || lead.businessName || prev.clientName,
        clientEmail: lead.email || prev.clientEmail,
        clientPhone: lead.phone || prev.clientPhone,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await quotesApi.create({
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined,
        leadId: leadId && leadId !== "none" ? leadId : undefined,
        lineItems: [
          {
            description: form.description || "Services",
            quantity: parseFloat(form.quantity) || 1,
            unitPrice: parseFloat(form.unitPrice) || 0,
          },
        ],
      });
      const quote = (res as { data?: { id: string }; id?: string })?.data ?? res;
      const id = (quote as { id: string }).id;
      toast.success("Quote created");
      onOpenChange(false);
      onCreated?.(id);
    } catch {
      toast.error("Failed to create quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const leadOptions = [
    { value: "none", label: "No linked lead" },
    ...leads.map((lead) => ({
      value: lead.id,
      label: leadLabel(lead),
      keywords: `${lead.leadName || ""} ${lead.businessName || ""} ${lead.email || ""}`,
    })),
  ];

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New quote"
      description="Create a sales quote. Optionally link a won lead to autofill client details."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-quote-form" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create quote"}
          </Button>
        </>
      }
    >
      <form id="create-quote-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Won lead (optional)</Label>
          <SearchableSelect
            value={leadId || "none"}
            onValueChange={handleLeadSelect}
            options={leadOptions}
            placeholder="Search won leads..."
            emptyText="No won leads found"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Client name</Label>
            <Input
              required
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Client email</Label>
            <Input
              type="email"
              required
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Client phone</Label>
          <Input
            value={form.clientPhone}
            onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Line item description</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Services"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Unit price</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
          </div>
        </div>
      </form>
    </FormSideSheet>
  );
}
