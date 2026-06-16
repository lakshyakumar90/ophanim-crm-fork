"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Building2, Loader2 } from "lucide-react";
import { rolesApi } from "@/lib/api";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { useDepartment } from "@/providers/department-context";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

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
      g.keys.map((k) => k.key).filter((k) => k !== "crm:admin"),
    ),
  },
};

export function PermissionChecklist({
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

interface RoleFormState {
  name: string;
  scope: "global" | "department";
  department_ids: string[];
  permissions: string[];
}

function toForm(role: Role | null): RoleFormState {
  return role
    ? {
        name: role.name,
        scope: role.scope,
        department_ids: role.departmentIds?.length
          ? role.departmentIds
          : role.departmentId
            ? [role.departmentId]
            : [],
        permissions: role.permissions,
      }
    : { name: "", scope: "department", department_ids: [], permissions: [] };
}

export function CreateRoleSheet({
  open,
  onOpenChange,
  editingRole,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRole: Role | null;
  onSaved: () => void;
}) {
  const { departments } = useDepartment();
  const [form, setForm] = useState<RoleFormState>(toForm(editingRole));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(toForm(editingRole));
  }, [editingRole, open]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v) setForm(toForm(editingRole));
      onOpenChange(v);
    },
    [editingRole, onOpenChange],
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
          ? { permissions: form.permissions }
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
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}
      description={
        editingRole
          ? "Update role scope, departments, and permissions."
          : "Define a custom role with scoped permissions."
      }
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
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
        </>
      }
    >
      <div className="space-y-5">
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

        <div className="space-y-1.5">
          <Label>Scope</Label>
          <div className="flex gap-3">
            {(["global", "department"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (!editingRole?.isSystem) setForm((f) => ({ ...f, scope: s }));
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
        </div>

        {form.scope === "department" && (
          <div className="space-y-1.5">
            <Label>Departments</Label>
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
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="preset-select">Start from Preset</Label>
          <Select onValueChange={applyPreset} defaultValue="none">
            <SelectTrigger id="preset-select">
              <SelectValue placeholder="Choose a preset to pre-fill permissions..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESETS).map(([key, p]) => (
                <SelectItem key={key} value={key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
            onChange={(perms) => setForm((f) => ({ ...f, permissions: perms }))}
          />
        </div>
      </div>
    </FormSideSheet>
  );
}
