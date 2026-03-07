"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { attendanceApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

function formatDateDisplay(dateStr: string) {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy (EEEE)");
  } catch {
    return dateStr;
  }
}

export default function HRHolidaysPage() {
  const [year, setYear] = useState(currentYear);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    date: "",
    isOptional: false,
  });

  const { data: holidays, isLoading } = useSWR(
    ["hr-holidays", year],
    () => attendanceApi.getHolidays(year),
  );

  const refreshHolidays = useCallback(async () => {
    await mutate(["hr-holidays", year]);
  }, [year]);

  useHeaderRefresh({
    onRefresh: refreshHolidays,
  });

  const holidayList: any[] = Array.isArray(holidays) ? holidays : [];

  const sorted = [...holidayList].sort((a, b) => {
    const da = a.holiday_date || a.date || "";
    const db = b.holiday_date || b.date || "";
    return da.localeCompare(db);
  });

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error("Holiday name is required");
      return;
    }
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    setIsSaving(true);
    try {
      await attendanceApi.createHoliday({
        name: form.name.trim(),
        date: form.date,
        isOptional: form.isOptional,
      });
      toast.success("Holiday added successfully");
      setAddOpen(false);
      setForm({ name: "", date: "", isOptional: false });
      mutate(["hr-holidays", year]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to add holiday");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await attendanceApi.deleteHoliday(deleteId);
      toast.success("Holiday removed");
      setDeleteId(null);
      mutate(["hr-holidays", year]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to delete holiday");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Holiday Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage company-wide public holidays
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Holiday
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Label>Year</Label>
        <Select
          value={String(year)}
          onValueChange={(v) => setYear(Number(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Holidays — {year}
            <Badge variant="secondary" className="ml-2">
              {sorted.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No holidays for {year}. Click "Add Holiday" to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((h, i) => {
                  const dateStr = h.holiday_date || h.date || "";
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {dateStr ? formatDateDisplay(dateStr) : "—"}
                      </TableCell>
                      <TableCell>{h.name}</TableCell>
                      <TableCell>
                        {h.is_optional ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Optional
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Mandatory
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(h.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Holiday Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name">Name *</Label>
              <Input
                id="holiday-name"
                placeholder="e.g. Republic Day"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holiday-date">Date *</Label>
              <Input
                id="holiday-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="holiday-optional"
                checked={form.isOptional}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isOptional: v }))}
              />
              <Label htmlFor="holiday-optional">Optional holiday</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving ? "Adding..." : "Add Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this holiday? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
