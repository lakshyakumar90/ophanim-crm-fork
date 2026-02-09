"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { recurringApi, type InvoiceLineItem } from "@/lib/finance-api";
import { leadsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function NewRecurringSchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [leadId, setLeadId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [taxRate, setTaxRate] = useState(18);
  const [autoSendEmail, setAutoSendEmail] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: "", quantity: 1, unit_price: 0 },
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
    }
  };

  // Line items management
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItemInput,
    value: string | number,
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Calculate base amount
  const baseAmount = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  const handleSubmit = async () => {
    if (!name || !clientName || !clientEmail || !startDate) {
      toast.error("Please fill in required fields");
      return;
    }

    if (lineItems.some((item) => !item.description || item.unit_price <= 0)) {
      toast.error("Please fill in all line items");
      return;
    }

    setIsSubmitting(true);
    try {
      await recurringApi.create({
        name,
        lead_id: leadId || undefined,
        client_name: clientName,
        client_email: clientEmail,
        frequency: frequency as any,
        day_of_month: frequency !== "weekly" ? dayOfMonth : undefined,
        day_of_week: frequency === "weekly" ? dayOfWeek : undefined,
        start_date: startDate,
        end_date: endDate || undefined,
        base_amount: baseAmount,
        tax_rate: taxRate,
        line_items_template: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        })),
        auto_send_email: autoSendEmail,
        requires_approval: requiresApproval,
      });

      toast.success("Recurring schedule created");
      router.push("/finance/recurring");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/finance/recurring">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            New Recurring Schedule
          </h1>
          <p className="text-muted-foreground">
            Set up automated invoice generation
          </p>
        </div>
      </div>

      {/* Schedule Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>
              Schedule Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly Retainer - Acme Corp"
            />
          </div>

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
                placeholder="Company name"
              />
            </div>
            <div>
              <Label>
                Client Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frequency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency === "weekly" ? (
              <div>
                <Label>Day of Week</Label>
                <Select
                  value={String(dayOfWeek)}
                  onValueChange={(v) => setDayOfWeek(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date (Optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items Template</CardTitle>
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
                <div className="col-span-6">
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
                <div className="col-span-1 text-right font-medium text-sm">
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

          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label>Tax Rate (%):</Label>
              <Input
                type="number"
                min="0"
                max="100"
                className="w-20 h-8"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Base Amount</p>
              <p className="text-xl font-bold">
                ₹{baseAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-send email</p>
              <p className="text-sm text-muted-foreground">
                Automatically email invoice to client
              </p>
            </div>
            <Switch
              checked={autoSendEmail}
              onCheckedChange={setAutoSendEmail}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Requires approval</p>
              <p className="text-sm text-muted-foreground">
                Generated invoices need manager approval
              </p>
            </div>
            <Switch
              checked={requiresApproval}
              onCheckedChange={setRequiresApproval}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/finance/recurring">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
      </div>
    </div>
  );
}
