"use client";

import { Save, Send } from "lucide-react";
import { useCreateEmailForm } from "@/hooks/finance/useCreateEmailForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";

function leadLabel(lead: {
  leadName?: string;
  lead_name?: string;
  businessName?: string;
  company_name?: string;
}) {
  return (
    lead.leadName ||
    lead.lead_name ||
    lead.businessName ||
    lead.company_name ||
    "Unnamed lead"
  );
}

function CreateEmailFormBody({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const {
    register,
    setValue,
    emailType,
    invoiceId,
    leadId,
    invoices,
    leads,
    isSubmitting,
    handleInvoiceChange,
    handleLeadChange,
    onSaveDraft,
    onSubmitForApproval,
  } = useCreateEmailForm({ onSuccess });

  const invoiceOptions = invoices.map(
    (inv: {
      id: string;
      invoice_number: string;
      client_name: string;
      clientName?: string;
    }) => ({
      value: inv.id,
      label: `${inv.invoice_number} - ${inv.client_name || inv.clientName || "Client"}`,
      keywords: inv.invoice_number,
    }),
  );

  const leadOptions = [
    { value: "none", label: "No linked lead" },
    ...leads.map((lead: {
      id: string;
      leadName?: string;
      lead_name?: string;
      businessName?: string;
      company_name?: string;
    }) => ({
      value: lead.id,
      label: leadLabel(lead),
      keywords: leadLabel(lead),
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm font-medium">Email type</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={emailType}
              onValueChange={(value) =>
                setValue("email_type", value as typeof emailType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {emailType === "invoice" && (
            <div className="space-y-2">
              <Label>Link to invoice</Label>
              <SearchableSelect
                value={invoiceId || ""}
                onValueChange={handleInvoiceChange}
                options={invoiceOptions}
                placeholder="Select invoice..."
                emptyText="No invoices found"
              />
            </div>
          )}

          {emailType !== "invoice" && (
            <div className="space-y-2">
              <Label>Link to lead (optional)</Label>
              <SearchableSelect
                value={leadId || "none"}
                onValueChange={handleLeadChange}
                options={leadOptions}
                placeholder="Select lead..."
                emptyText="No won leads found"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium">Recipient</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Recipient name</Label>
            <Input placeholder="Client name" {...register("recipient_name")} />
          </div>
          <div className="space-y-2">
            <Label>
              Recipient email <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              placeholder="client@example.com"
              {...register("recipient_email")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium">Content</p>
        <div className="space-y-2">
          <Label>
            Subject <span className="text-destructive">*</span>
          </Label>
          <Input placeholder="Email subject" {...register("subject")} />
        </div>
        <div className="space-y-2">
          <Label>
            Body <span className="text-destructive">*</span>
          </Label>
          <Textarea placeholder="Email body..." rows={8} {...register("body")} />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onSaveDraft} disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          Save draft
        </Button>
        <Button onClick={onSubmitForApproval} disabled={isSubmitting}>
          <Send className="mr-2 h-4 w-4" />
          Submit for approval
        </Button>
      </div>
    </div>
  );
}

export function CreateEmailSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New email request"
      description="Create a finance email for approval and sending."
      size="xl"
    >
      <CreateEmailFormBody
        onSuccess={() => {
          onOpenChange(false);
          onCreated?.();
        }}
      />
    </FormSideSheet>
  );
}

/** @deprecated Use CreateEmailSheet on the list page instead. */
export function CreateEmailForm() {
  return <CreateEmailFormBody />;
}
