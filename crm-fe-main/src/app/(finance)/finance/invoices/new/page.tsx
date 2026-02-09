"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { invoicesApi, type InvoiceLineItem } from "@/lib/finance-api";
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
import { FileText, ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export default function NewInvoicePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [leadId, setLeadId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(18);
  const [discountRate, setDiscountRate] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
  ]);

  // Fetch leads for dropdown
  const { data: leadsData, isLoading: leadsLoading } = useSWR(
    user ? "leads-list" : null,
    () => leadsApi.list({ limit: 100 }),
  );

  const leads = leadsData?.data || [];

  // Auto-fill client info when lead is selected
  const handleLeadChange = (id: string) => {
    setLeadId(id);
    const lead = leads.find((l: any) => l.id === id);
    if (lead) {
      setClientName(lead.company_name || lead.lead_name || "");
      setClientEmail(lead.email || "");
      setClientPhone(lead.phone || "");
    }
  };

  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
    ]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Update line item
  const updateLineItem = (
    index: number,
    field: keyof LineItemInput,
    value: string | number,
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalAmount = taxableAmount + taxAmount;

  // Submit
  const handleSubmit = async (submitForApproval: boolean = false) => {
    if (!clientName || !clientEmail || !dueDate) {
      toast.error("Please fill in required fields");
      return;
    }

    if (lineItems.some((item) => !item.description || item.unit_price <= 0)) {
      toast.error("Please fill in all line items");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await invoicesApi.create({
        lead_id: leadId || undefined,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || undefined,
        client_address: clientAddress || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate,
        tax_rate: taxRate,
        discount_rate: discountRate,
        payment_terms: paymentTerms,
        notes: notes || undefined,
        line_items: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          total: item.quantity * item.unit_price,
        })),
      });

      const invoiceId = response.data.data.id;

      if (submitForApproval) {
        await invoicesApi.submit(invoiceId);
        toast.success("Invoice created and submitted for approval");
      } else {
        toast.success("Invoice created as draft");
      }

      router.push("/finance/invoices");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/finance/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            New Invoice
          </h1>
          <p className="text-muted-foreground">Create a new invoice</p>
        </div>
      </div>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Link to Lead (Optional)</Label>
            <Select value={leadId} onValueChange={handleLeadChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lead..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked lead</SelectItem>
                {leads.map((lead: any) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.lead_name} - {lead.company_name || lead.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Company or individual name"
              />
            </div>
            <div>
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Billing address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label>
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-center p-3 bg-muted/50 rounded-lg"
              >
                <div className="col-span-5">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(
                        index,
                        "quantity",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Price"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateLineItem(
                        index,
                        "unit_price",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div className="col-span-2 text-right font-medium">
                  ₹{(item.quantity * item.unit_price).toLocaleString()}
                </div>
                <div className="col-span-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-muted-foreground">Discount (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                className="w-20 text-right h-8"
                value={discountRate}
                onChange={(e) =>
                  setDiscountRate(parseFloat(e.target.value) || 0)
                }
              />
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-rose-600">
                <span>Discount</span>
                <span>-₹{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-muted-foreground">Tax (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                className="w-20 text-right h-8"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax Amount</span>
              <span>₹{taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or terms..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/finance/invoices">
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
          Save & Submit for Approval
        </Button>
      </div>
    </div>
  );
}
