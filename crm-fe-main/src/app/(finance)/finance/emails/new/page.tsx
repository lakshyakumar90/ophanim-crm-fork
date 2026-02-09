"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { emailRequestsApi, invoicesApi } from "@/lib/finance-api";
import { leadsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
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
import { Mail, ArrowLeft, Save, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewEmailRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [emailType, setEmailType] = useState<string>("invoice");
  const [invoiceId, setInvoiceId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Fetch invoices for dropdown
  const { data: invoicesData, isLoading: invoicesLoading } = useSWR(
    user ? "invoices-for-email" : null,
    () => invoicesApi.list({ limit: 100 }),
  );

  // Fetch leads for dropdown
  const { data: leadsData, isLoading: leadsLoading } = useSWR(
    user ? "leads-for-email" : null,
    () => leadsApi.list({ limit: 100 }),
  );

  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const leads = leadsData?.data || [];

  // Auto-fill when invoice is selected
  const handleInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const invoice = invoices.find((inv: any) => inv.id === id);
    if (invoice) {
      setRecipientName(invoice.client_name);
      setRecipientEmail(invoice.client_email);
      setSubject(`Invoice ${invoice.invoice_number}`);
      setBody(
        `Dear ${invoice.client_name},\n\nPlease find attached your invoice ${invoice.invoice_number} for ₹${Number(invoice.total_amount).toLocaleString()}.\n\nDue date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nThank you for your business!`,
      );
    }
  };

  // Auto-fill when lead is selected
  const handleLeadChange = (id: string) => {
    setLeadId(id);
    const lead = leads.find((l: any) => l.id === id);
    if (lead) {
      setRecipientName(lead.lead_name || lead.company_name || "");
      setRecipientEmail(lead.email || "");
    }
  };

  const handleSubmit = async (submitForApproval: boolean) => {
    if (!recipientEmail || !subject || !body) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await emailRequestsApi.create({
        email_type: emailType as any,
        invoice_id: invoiceId || undefined,
        lead_id: leadId || undefined,
        recipient_email: recipientEmail,
        recipient_name: recipientName || undefined,
        subject,
        body,
      });

      if (submitForApproval) {
        await emailRequestsApi.submit(response.data.data.id);
        toast.success("Email request submitted for approval");
      } else {
        toast.success("Email request saved as draft");
      }

      router.push("/finance/emails");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to create email request",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/finance/emails">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            New Email Request
          </h1>
          <p className="text-muted-foreground">
            Create a finance email request
          </p>
        </div>
      </div>

      {/* Email Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Email Type</Label>
              <Select value={emailType} onValueChange={setEmailType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="payment_reminder">
                    Payment Reminder
                  </SelectItem>
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
                    {invoices.map((inv: any) => (
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

      {/* Recipient */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Recipient Name</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Client name"
              />
            </div>
            <div>
              <Label className="mb-2">
                Recipient Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
          <div>
            <Label className="mb-2">
              Body <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body..."
              rows={10}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/finance/emails">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button onClick={() => handleSubmit(true)} disabled={isSubmitting}>
          <Send className="h-4 w-4 mr-2" />
          Submit for Approval
        </Button>
      </div>
    </div>
  );
}
