"use client";

import { useState, useCallback, useEffect } from "react";
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
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { rolesApi } from "@/lib/api";
import { PERMISSION_GROUPS } from "@/lib/permissions";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

// ── Permission Presets ────────────────────────────────────────────────────────
// Descriptive presets with a slug key that maps to a permission set.
// Each preset pre-fills the checklist — admins can still adjust freely.
const PRESETS: Record<
  string,
  { label: string; description: string; permissions: string[] }
> = {
  none: {
    label: "— None (start blank) —",
    description: "Start with no permissions selected.",
    permissions: [],
  },
  "sales-executive": {
    label: "Sales Executive",
    description: "Create, import, and export own sales leads.",
    permissions: [
      "leads:view",
      "leads:create",
      "leads:import",
      "leads:export",
      "analytics:view_own",
    ],
  },
  "sales-manager": {
    label: "Sales Manager",
    description: "Full lead management + team analytics.",
    permissions: [
      "leads:view",
      "leads:create",
      "leads:import",
      "leads:export",
      "leads:edit",
      "leads:assign",
      "analytics:view_own",
      "analytics:view_team",
    ],
  },
  developer: {
    label: "Developer / Designer",
    description: "Project visibility + own analytics.",
    permissions: ["projects:view", "analytics:view_own"],
  },
  "project-manager": {
    label: "Project Manager",
    description: "Manage projects, assign members, team analytics.",
    permissions: [
      "projects:view",
      "projects:create",
      "projects:edit",
      "projects:assign_member",
      "employees:view",
      "analytics:view_own",
      "analytics:view_team",
    ],
  },
  "hr-manager": {
    label: "HR Manager",
    description: "Full HR access + employee management.",
    permissions: [
      "employees:view",
      "employees:create",
      "employees:edit",
      "employees:manage",
      "hr:view",
      "hr:manage",
      "analytics:view_own",
      "analytics:view_team",
    ],
  },
  "finance-manager": {
    label: "Finance Manager",
    description: "Full finance access + team analytics.",
    permissions: [
      "finance:view",
      "finance:manage",
      "analytics:view_own",
      "analytics:view_team",
    ],
  },
  operations: {
    label: "Operations",
    description: "Cross-org read access and org-wide analytics.",
    permissions: [
      "leads:view",
      "projects:view",
      "employees:view",
      "analytics:view_team",
      "analytics:view_all",
    ],
  },
  "view-only": {
    label: "View Only",
    description: "Read-only access to all core modules.",
    permissions: [
      "leads:view",
      "projects:view",
      "employees:view",
      "analytics:view_own",
      "finance:view",
      "hr:view",
    ],
  },
  "full-access": {
    label: "Full Access",
    description: "All permissions except crm:admin superuser flag.",
    permissions: PERMISSION_GROUPS.flatMap((g) =>
      g.keys
        .map((k) => k.key)
        .filter((k) => k !== "crm:admin"),
    ),
  },
};

// ── Permission Checklist ──────────────────────────────────────────────────────
function PermissionChecklist({
  selectedPerms,
  onChange,
  readOnly = false,
}: {
  selectedPerms: string[];
  onChange: (perms: string[]) => void;
  readOnly?: boolean;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggle = (perm: string) => {
    if (selectedPerms.includes(perm)) {
      onChange(selectedPerms.filter((p) => p !== perm));
    } else {
      onChange([...selectedPerms, perm]);
    }
  };

  const toggleGroup = (keys: string[], checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...selectedPerms, ...keys])));
    } else {
      onChange(selectedPerms.filter((p) => !keys.includes(p)));
    }
  };

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {PERMISSION_GROUPS.map((group) => {
        const keys = group.keys.map((k) => k.key);
        const allChecked = keys.every((k) => selectedPerms.includes(k));
        const someChecked = keys.some((k) => selectedPerms.includes(k));
        const isOpen = openGroups[group.id] ?? true;

        return (
          <Collapsible
            key={group.id}
            open={isOpen}
            onOpenChange={(v) =>
              setOpenGroups((prev) => ({ ...prev, [group.id]: v }))
            }
          >
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/30">
              <Checkbox
                id={`group-${group.id}`}
                checked={
                  allChecked ? true : someChecked ? "indeterminate" : false
                }
                onCheckedChange={(v) => toggleGroup(keys, !!v)}
                disabled={readOnly}
              />
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 flex-1 text-left"
                >
                  <label
                    htmlFor={`group-${group.id}`}
                    className="font-semibold text-sm cursor-pointer"
                  >
                    {group.label}
                  </label>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({keys.filter((k) => selectedPerms.includes(k)).length}/
                    {keys.length})
                  </span>
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="pl-6 space-y-1 pt-1">
              {group.keys.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={key}
                    checked={selectedPerms.includes(key)}
                    onCheckedChange={() => toggle(key)}
                    disabled={readOnly}
                  />
                  <label
                    htmlFor={key}
                    className="text-sm cursor-pointer font-normal flex-1"
                  >
                    {label}
                    <span className="ml-2 text-[10px] text-muted-foreground font-mono">
                      {key}
                    </span>
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

// ── Role Modal ────────────────────────────────────────────────────────────────
interface RoleFormState {
  name: string;
  scope: "global" | "department";
  department_ids: string[];
  permissions: string[];
}

function RoleModal({
  open,
  onClose,
  editingRole,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editingRole: Role | null;
  onSaved: () => void;
}) {
  const { departments } = useDepartment();

  const toForm = (role: Role | null): RoleFormState =>
    role
      ? {
          name: role.name,
          scope: role.scope,
          department_ids: role.departmentIds?.length ? role.departmentIds : (role.departmentId ? [role.departmentId] : []),
          permissions: role.permissions,
        }
      : { name: "", scope: "department", department_ids: [], permissions: [] };

  const [form, setForm] = useState<RoleFormState>(toForm(editingRole));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toForm(editingRole));
    }
  }, [editingRole, open]);

  // Reset form when modal opens with a new (or null) role
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v) setForm(toForm(editingRole));
      else onClose();
    },
    [editingRole, onClose],
  );

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset || presetKey === "none") return;
    setForm((f) => ({ ...f, permissions: preset.permissions }));
  };

  const toggleDept = (deptId: string) => {
    setForm((f) => ({
      ...f,
      department_ids: f.department_ids.includes(deptId)
        ? f.department_ids.filter((d) => d !== deptId)
        : [...f.department_ids, deptId],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    if (form.scope === "department" && form.department_ids.length === 0) {
      toast.error("Please select at least one department for this role");
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        const payload = editingRole.isSystem
          ? {
              permissions: form.permissions,
            }
          : {
              name: form.name,
              scope: form.scope,
              department_ids: form.scope === "global" ? null : form.department_ids,
              department_id: form.scope === "global" ? null : form.department_ids[0] ?? null,
              permissions: form.permissions,
            };

        await rolesApi.update(editingRole.id, payload);
        toast.success("Role updated");
      } else {
        await rolesApi.create({
          name: form.name,
          scope: form.scope,
          department_ids: form.scope === "global" ? undefined : form.department_ids,
          department_id: form.scope === "global" ? undefined : form.department_ids[0],
          permissions: form.permissions,
        } as any);
        toast.success("Role created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Failed to save role",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Content Strategist"
              disabled={editingRole?.isSystem}
            />
            {editingRole?.isSystem ? (
              <p className="text-xs text-amber-600">
                System role name cannot be changed. You can still update its permissions.
              </p>
            ) : editingRole ? (
              <p className="text-xs text-muted-foreground">
                Slug ({editingRole.slug}) is permanent and cannot be changed.
              </p>
            ) : null}
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <Label>Scope</Label>
            <div className="flex gap-3">
              {(["global", "department"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (!editingRole?.isSystem)
                      setForm((f) => ({ ...f, scope: s }));
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.scope === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  } ${editingRole?.isSystem ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {s === "global" ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                  <span>{s === "global" ? "Global (all depts)" : "Department"}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {form.scope === "global"
                ? "Global roles can see data across all departments."
                : "Department roles are scoped to selected departments. A role can span multiple departments."}
            </p>
          </div>

          {/* Departments (multi-checkbox, only when scope = department) */}
          {form.scope === "department" && (
            <div className="space-y-1.5">
              <Label>
                Departments
                <span className="ml-1 text-muted-foreground font-normal text-xs">
                  (select one or more)
                </span>
              </Label>
              <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                {departments.map((d) => (
                  <label
                    key={d.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors ${editingRole?.isSystem ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Checkbox
                      checked={form.department_ids.includes(d.id)}
                      onCheckedChange={() => {
                        if (!editingRole?.isSystem) toggleDept(d.id);
                      }}
                      disabled={editingRole?.isSystem}
                    />
                    <span className="text-sm">{d.name}</span>
                    {d.slug && (
                      <span className="text-xs text-muted-foreground font-mono ml-auto">{d.slug}</span>
                    )}
                  </label>
                ))}
                {departments.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-4">No departments available.</p>
                )}
              </div>
              {form.department_ids.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {departments.filter((d) => form.department_ids.includes(d.id)).map((d) => d.name).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Preset selector — drives the checklist below */}
          <div className="space-y-1.5">
            <Label htmlFor="preset-select">Start from Preset</Label>
            <Select onValueChange={applyPreset} defaultValue="none">
              <SelectTrigger id="preset-select">
                <SelectValue placeholder="Choose a preset to pre-fill permissions..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESETS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <span className="font-medium">{p.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        — {p.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Presets pre-fill the checklist below. You can still customise any
              individual permission after selecting.
            </p>
          </div>

          {/* Permissions checklist */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Permissions
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {form.permissions.length} selected
                </span>
              </Label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, permissions: [] }))}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            </div>
            <PermissionChecklist
              selectedPerms={form.permissions}
              onChange={(perms) =>
                setForm((f) => ({ ...f, permissions: perms }))
              }
            />
            {form.permissions.length === 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <span>⚠️</span>
                No permissions selected — this role will have no access to anything.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : editingRole ? (
              "Save Changes"
            ) : (
              "Create Role"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
      <RoleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
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
