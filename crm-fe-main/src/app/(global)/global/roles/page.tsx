"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Globe,
  Building2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { rolesApi } from "@/lib/api";
import { CreateRoleSheet, PermissionChecklist } from "@/components/global/roles/CreateRoleSheet";
import type { Role } from "@/lib/permissions";
import { useDepartment } from "@/providers/department-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// ── Delete confirmation state ─────────────────────────────────────────────────
interface DeleteState {
  role: Role;
  assignedCount: number | null; // null = not yet checked; will be set if 409
  step: "confirm" | "force-confirm"; // "confirm" = initial check; "force-confirm" = knows it has users
}

function RoleDetailsDialog({
  role,
  open,
  onOpenChange,
}: {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role.name}</DialogTitle>
          <DialogDescription>
            {role.scope === "global"
              ? "Global role with CRM-wide access."
              : `Department role${role.departmentName ? ` for ${role.departmentName}` : ""}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{role.slug}</Badge>
            <Badge variant="secondary">{role.permissions.length} permissions</Badge>
            <Badge variant="outline">{role.isSystem ? "System" : "Custom"}</Badge>
          </div>
          <PermissionChecklist
            selectedPerms={role.permissions}
            onChange={() => undefined}
            readOnly
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { departments } = useDepartment();

  const { data: roles = [], isLoading, mutate: mutateRoles } = useSWR(
    "all-roles",
    () => rolesApi.list(),
  );

  const openCreate = () => {
    setEditingRole(null);
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  // ── Delete flow (✅ Issue 6: two-step force-delete) ─────────────────────────
  const handleDeleteClick = (role: Role) => {
    if (role.isSystem) return; // button is disabled — but guard anyway
    setDeleteState({ role, assignedCount: null, step: "confirm" });
  };

  const handleDeleteConfirm = async (force = false) => {
    if (!deleteState) return;
    setDeleting(true);
    try {
      await rolesApi.delete(deleteState.role.id, force);
      toast.success(`Role "${deleteState.role.name}" deleted`);
      mutateRoles();
      setDeleteState(null);
    } catch (err: any) {
      const status = err?.response?.status;
      const details = err?.response?.data?.error?.details;

      if (status === 409 && details?.assignedCount) {
        // Role is in use — escalate to force-confirm step
        setDeleteState((prev) =>
          prev
            ? {
                ...prev,
                assignedCount: details.assignedCount as number,
                step: "force-confirm",
              }
            : null,
        );
      } else {
        toast.error(
          err?.response?.data?.error?.message ?? "Failed to delete role",
        );
        setDeleteState(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Create custom roles and assign them to users. Each user&apos;s
            effective permissions are the union of all their roles.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Roles
            {!isLoading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({roles.length})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            System roles (padlock) are seeded automatically and cannot be
            deleted. Their permissions can still be updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No roles yet. Create one above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Perms</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell
                      className="cursor-pointer"
                      onClick={() => setViewingRole(role)}
                    >
                      <div className="flex items-center gap-2">
                        {role.isSystem && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <div>
                          <p className="font-medium leading-none">{role.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {role.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => setViewingRole(role)}>
                      <Badge
                        variant="outline"
                        className={
                          role.scope === "global"
                            ? "text-blue-600 border-blue-300"
                            : "text-violet-600 border-violet-300"
                        }
                      >
                        {role.scope === "global" ? (
                          <Globe className="h-3 w-3 mr-1" />
                        ) : (
                          <Building2 className="h-3 w-3 mr-1" />
                        )}
                        {role.scope === "global" ? "Global" : "Dept"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => setViewingRole(role)}>
                      {role.scope === "global" ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : role.departmentIds && role.departmentIds.length > 1 ? (
                        <div className="flex flex-wrap gap-1">
                          {role.departmentIds.map((dId, idx) => {
                            const dept = departments.find((d) => d.id === dId);
                            return (
                              <Badge key={dId} variant="outline" className="text-xs font-normal">
                                {dept?.name ?? (idx === 0 && role.departmentName ? role.departmentName : dId.slice(0, 8))}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {role.departmentName ?? "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-center cursor-pointer"
                      onClick={() => setViewingRole(role)}
                    >
                      <Badge variant="secondary">{role.permissions.length}</Badge>
                    </TableCell>
                    <TableCell onClick={() => setViewingRole(role)}>
                      {role.isSystem ? (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs text-green-600 border-green-300"
                        >
                          Custom
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(role);
                          }}
                          title="Edit role"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteClick(role);
                          }}
                          disabled={role.isSystem}
                          title={
                            role.isSystem
                              ? "System roles cannot be deleted"
                              : "Delete role"
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <CreateRoleSheet
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingRole={editingRole}
        onSaved={() => mutateRoles()}
      />
      <RoleDetailsDialog
        role={viewingRole}
        open={!!viewingRole}
        onOpenChange={(open) => !open && setViewingRole(null)}
      />

      {/* Step 1 — Initial delete confirmation */}
      <AlertDialog
        open={!!deleteState && deleteState.step === "confirm"}
        onOpenChange={(v) => !v && setDeleteState(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteState?.role.name}</strong>? If any users are
              assigned this role, you will be asked to confirm again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteConfirm(false)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 2 — Force-delete confirmation (role has assigned users) ✅ Issue 6 */}
      <AlertDialog
        open={!!deleteState && deleteState.step === "force-confirm"}
        onOpenChange={(v) => !v && setDeleteState(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Role is in use — confirm force delete
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>{deleteState?.role.name}</strong> is currently
                  assigned to{" "}
                  <strong className="text-foreground">
                    {deleteState?.assignedCount} user
                    {deleteState?.assignedCount !== 1 ? "s" : ""}
                  </strong>
                  .
                </p>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  Deleting this role will immediately revoke all associated
                  permissions from those users. This cannot be undone.
                </div>
                <p>Are you sure you want to proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteConfirm(true)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Yes, delete and revoke"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
