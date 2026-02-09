"use client";

import { useState } from "react";
import useSWR from "swr";
import { leadsApi, usersApi } from "@/lib/api";
import { toast } from "sonner";
import { UserSelector } from "@/components/shared/user-selector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { getAllStatuses } from "@/lib/lead-status-config";

interface BulkEditLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}

const LEAD_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "cold_call", label: "Cold Call" },
  { value: "email_campaign", label: "Email Campaign" },
  { value: "social_media", label: "Social Media" },
  { value: "trade_show", label: "Trade Show" },
  { value: "advertisement", label: "Advertisement" },
  { value: "partner", label: "Partner" },
  { value: "organic_search", label: "Organic Search" },
  { value: "paid_search", label: "Paid Search" },
  { value: "direct", label: "Direct" },
  { value: "other", label: "Other" },
];

export function BulkEditLeadsDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkEditLeadsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [assignTo, setAssignTo] = useState<string>("");

  // Fetch users for assignment dropdown
  const { data: usersData, isLoading: loadingUsers } = useSWR(
    open ? "users-list" : null,
    () => usersApi.list({ limit: 100 }),
  );

  // Handle the nested data structure properly
  const users = usersData?.data || [];

  const resetForm = () => {
    setStatus("");
    setSource("");
    setCity("");
    setState("");
    setCountry("");
    setIndustry("");
    setAssignTo("");
  };

  const handleSubmit = async () => {
    // Build update data - only include non-empty fields
    const data: Record<string, unknown> = {};

    if (status) data.status = status;
    if (source) data.source = source;
    if (city.trim()) data.city = city.trim();
    if (state.trim()) data.state = state.trim();
    if (country.trim()) data.country = country.trim();
    if (industry.trim()) data.industry = industry.trim();

    // Check if any field is set (including assignment)
    if (Object.keys(data).length === 0 && !assignTo) {
      toast.error(
        "Please fill at least one field to update or select a user to assign"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let updateSuccess = 0;
      let assignSuccess = 0;

      // Handle bulk update (non-assignment fields)
      if (Object.keys(data).length > 0) {
        const response = await leadsApi.bulkUpdate(selectedIds, data);
        const result = response.data.data;
        updateSuccess = result.success;
        if (result.failed > 0) {
          toast.error(`Failed to update ${result.failed} lead(s)`);
        }
      }

      // Handle bulk assignment separately
      if (assignTo) {
        const assignResponse = await leadsApi.bulkAssign(selectedIds, assignTo);
        const assignResult = assignResponse.data.data;
        assignSuccess = assignResult.success;
        if (assignResult.failed > 0) {
          toast.error(`Failed to assign ${assignResult.failed} lead(s)`);
        }
      }

      // Show success messages
      if (updateSuccess > 0) {
        toast.success(`Successfully updated ${updateSuccess} lead(s)`);
      }
      if (assignSuccess > 0) {
        toast.success(`Successfully assigned ${assignSuccess} lead(s)`);
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to update leads"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit Leads</DialogTitle>
          <DialogDescription>
            Update {selectedIds.length} selected lead(s). Only filled fields
            will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Assign To (Admin Only) */}
          <div className="grid gap-2">
            <Label htmlFor="assignTo" className="flex items-center gap-2">
              Assign To
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Admin Only
              </span>
            </Label>
            <UserSelector
              users={users}
              value={assignTo}
              onValueChange={setAssignTo}
              placeholder="Search and select user to assign (optional)..."
              disabled={loadingUsers}
            />
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status (optional)" />
              </SelectTrigger>
              <SelectContent>
                {getAllStatuses().map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="grid gap-2">
            <Label htmlFor="source">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select source (optional)" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Industry */}
          <div className="grid gap-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Enter industry (optional)"
            />
          </div>

          {/* Location Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update {selectedIds.length} Lead(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
