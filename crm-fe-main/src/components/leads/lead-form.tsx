"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Lead } from "@/types";
import { getAllStatuses } from "@/lib/lead-status-config";

const leadSchema = z.object({
  leadName: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  status: z.string().default("fresh_lead"),
  source: z.string().optional(),
  timezone: z.string().optional(),
  nalReason: z.string().optional(),
  clientResponse: z.string().optional(),
  leadType: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  initialData?: Lead;
  mode: "create" | "edit";
}

const TIMEZONE_OPTIONS = ["EST", "CST", "MST", "PST"] as const;

export function LeadForm({ initialData, mode }: LeadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: initialData
      ? {
          leadName: initialData.leadName,
          businessName: initialData.businessName || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          country: initialData.country || "",
          status: initialData.status,
          source: initialData.source || undefined,
          website: initialData.website || "",
          timezone: initialData.timezone || "",
          nalReason: initialData.nalReason || "",
          clientResponse: initialData.clientResponse || "",
          leadType: initialData.leadType || "",
        }
      : {
          status: "fresh_lead",
        },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      // Helper to sanitize empty strings to undefined
      const sanitize = (val: any) => (val === "" ? undefined : val);
      // Backend expects absolute URL format; normalize bare domains on submit.
      const normalizeWebsite = (website?: string) => {
        if (!website) return website;
        const trimmed = website.trim();
        if (!trimmed) return "";
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
      };

      const payload = {
        ...data,
        // Enum or Format fields that can't be empty string
        email: sanitize(data.email),
        website: sanitize(normalizeWebsite(data.website)),
        source: sanitize(data.source),
        // Other optionals
        businessName: sanitize(data.businessName),
        phone: sanitize(data.phone),
        country: sanitize(data.country),
        timezone: sanitize(data.timezone),
        nalReason: sanitize(data.nalReason),
        clientResponse: sanitize(data.clientResponse),
        leadType: sanitize(data.leadType),
      };

      if (mode === "create") {
        await leadsApi.create(payload);
        toast.success("Lead created successfully");
        router.push("/sales/leads");
      } else {
        if (!initialData?.id) return;
        await leadsApi.update(initialData.id, payload);
        toast.success("Lead updated successfully");
        router.refresh();
        router.push(`/sales/leads/${initialData.id}`);
      }
    } catch (error: any) {
      console.error(error);
      const message =
        error.response?.data?.error?.message || `Failed to ${mode} lead`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            if (mode === "edit" && initialData) {
              router.push(`/sales/leads/${initialData.id}`);
            } else {
              router.push("/sales/leads");
            }
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Create New Lead" : "Edit Lead"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "create"
              ? "Add a new lead to your pipeline"
              : "Update lead information"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadName">Lead Name *</Label>
              <Input
                id="leadName"
                {...register("leadName")}
                placeholder="John Doe"
              />
              {errors.leadName && (
                <p className="text-sm text-red-500">
                  {errors.leadName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                {...register("businessName")}
                placeholder="Acme Corp"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+91 98765 43210"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lead Details */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {getAllStatuses().map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={watch("source") || ""}
                onValueChange={(v) => setValue("source", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="email_campaign">Email Campaign</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="trade_show">Trade Show</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadType">Lead Type</Label>
              <Input
                id="leadType"
                {...register("leadType")}
                placeholder="e.g. Inbound / Enterprise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...register("website")}
                placeholder="https://example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lead Context - New Section */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Context</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nalReason">NAL Reason</Label>
              <Input
                id="nalReason"
                {...register("nalReason")}
                placeholder="Reason if Not A Lead"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="clientResponse">Client's Response</Label>
              <Textarea
                id="clientResponse"
                {...register("clientResponse")}
                placeholder="Feedback or response from the client..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register("country")}
                placeholder="India"
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={watch("timezone") || ""}
                onValueChange={(v) => setValue("timezone", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (mode === "edit" && initialData) {
                router.push(`/sales/leads/${initialData.id}`);
              } else {
                router.push("/sales/leads");
              }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "create" ? "Creating..." : "Updating..."}
              </>
            ) : mode === "create" ? (
              "Create Lead"
            ) : (
              "Update Lead"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
