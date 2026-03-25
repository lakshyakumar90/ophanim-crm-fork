"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { LeaveTypeDto } from "@/types/hr-leaves";
import { LeaveTypeModal } from "./LeaveTypeModal";
import { updateLeaveType } from "@/lib/hr-leave-api";
import { slugifyLeaveTypeName } from "@/lib/hr-leave-utils";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

export function LeaveSettingsTab({
  types,
  loading,
  onRefresh,
}: {
  types: LeaveTypeDto[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<LeaveTypeDto | null>(null);
  const [confirmOff, setConfirmOff] = useState<LeaveTypeDto | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleActive = async (row: LeaveTypeDto, next: boolean) => {
    if (!next) {
      setConfirmOff(row);
      return;
    }
    setTogglingId(row.id);
    try {
      await updateLeaveType(row.id, { isActive: true });
      toast.success("Activated");
      await onRefresh();
    } catch {
      toast.error("Update failed");
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!confirmOff) return;
    setTogglingId(confirmOff.id);
    try {
      await updateLeaveType(confirmOff.id, { isActive: false });
      toast.success("Deactivated");
      setConfirmOff(null);
      await onRefresh();
    } catch {
      toast.error("Update failed");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading && types.length === 0) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="gap-2"
          onClick={() => {
            setEditRow(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add leave type
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Carry</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {slugifyLeaveTypeName(t.name)}
                </TableCell>
                <TableCell>{t.daysAllowed}</TableCell>
                <TableCell>{t.isPaid ? "Yes" : "No"}</TableCell>
                <TableCell>{t.carryForward ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={t.isActive}
                      disabled={togglingId === t.id}
                      onCheckedChange={(v) => void toggleActive(t, v)}
                    />
                    <Badge variant={t.isActive ? "default" : "secondary"}>
                      {t.isActive ? "On" : "Off"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditRow(t);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LeaveTypeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editRow}
        onSaved={async () => {
          await onRefresh();
          setEditRow(null);
        }}
      />

      <AlertDialog open={!!confirmOff} onOpenChange={(o) => !o && setConfirmOff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate leave type?</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivating will hide this leave type from new requests. Existing approved leaves of
              this type are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeactivate()}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
