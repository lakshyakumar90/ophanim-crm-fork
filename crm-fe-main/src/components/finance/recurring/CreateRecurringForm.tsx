"use client";

import Link from "next/link";
import { Plus, Trash2, Save } from "lucide-react";
import { useCreateRecurringForm } from "@/hooks/finance/useCreateRecurringForm";
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

export function CreateRecurringForm() {
  const {
    register,
    watch,
    setValue,
    frequency,
    lineItems,
    leads,
    baseAmount,
    days,
    handleLeadChange,
    addLineItem,
    removeLineItem,
    updateLineItem,
    isSubmitting,
    onSubmit,
  } = useCreateRecurringForm();

  const dayOfMonth = watch("day_of_month");
  const dayOfWeek = watch("day_of_week");
  const taxRate = watch("tax_rate");
  const autoSendEmail = watch("auto_send_email");
  const requiresApproval = watch("requires_approval");
  const leadId = watch("lead_id");

  return (
    <>
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
              placeholder="e.g., Monthly Retainer - Acme Corp"
              {...register("name")}
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
              <Input placeholder="Company name" {...register("client_name")} />
            </div>
            <div>
              <Label>
                Client Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                placeholder="client@example.com"
                {...register("client_email")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frequency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setValue("frequency", value as typeof frequency)
                }
              >
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
                  onValueChange={(v) => setValue("day_of_week", parseInt(v))}
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
                  onChange={(e) =>
                    setValue("day_of_month", parseInt(e.target.value) || 1)
                  }
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input type="date" {...register("start_date")} />
            </div>
            <div>
              <Label>End Date (Optional)</Label>
              <Input type="date" {...register("end_date")} />
            </div>
          </div>
        </CardContent>
      </Card>

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
                onChange={(e) =>
                  setValue("tax_rate", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Base Amount</p>
              <p className="text-xl font-bold">₹{baseAmount.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              onCheckedChange={(checked) => setValue("auto_send_email", checked)}
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
              onCheckedChange={(checked) => setValue("requires_approval", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href="/finance/recurring">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
      </div>
    </>
  );
}
