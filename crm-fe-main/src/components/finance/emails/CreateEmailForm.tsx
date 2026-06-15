"use client";

import Link from "next/link";
import { Save, Send } from "lucide-react";
import { useCreateEmailForm } from "@/hooks/finance/useCreateEmailForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateEmailForm() {
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
  } = useCreateEmailForm();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Email Type</Label>
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
              <div>
                <Label className="mb-2">Link to Invoice</Label>
                <Select value={invoiceId} onValueChange={handleInvoiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice..." />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv: { id: string; invoice_number: string; client_name: string }) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} - {inv.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {emailType !== "invoice" && (
              <div>
                <Label className="mb-2">Link to Lead (Optional)</Label>
                <Select value={leadId} onValueChange={handleLeadChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked lead</SelectItem>
                    {leads.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.lead_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Recipient Name</Label>
              <Input placeholder="Client name" {...register("recipient_name")} />
            </div>
            <div>
              <Label className="mb-2">
                Recipient Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                placeholder="client@example.com"
                {...register("recipient_email")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input placeholder="Email subject" {...register("subject")} />
          </div>
          <div>
            <Label className="mb-2">
              Body <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Email body..."
              rows={10}
              {...register("body")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href="/finance/emails">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button variant="outline" onClick={onSaveDraft} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button onClick={onSubmitForApproval} disabled={isSubmitting}>
          <Send className="h-4 w-4 mr-2" />
          Submit for Approval
        </Button>
      </div>
    </>
  );
}
