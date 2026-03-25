# Multi-Department Users - Step-by-Step Implementation

## Step 1: Create MultiSelect Component

**File**: Create `crm-fe-main/src/components/ui/multi-select.tsx`

```typescript
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { X, ChevronDown } from "lucide-react";

interface MultiSelectProps {
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  disabled = false,
}: MultiSelectProps) {
  const selectedNames = selected
    .map((id) => options.find((o) => o.id === id)?.name)
    .filter(Boolean);

  const toggleOption = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    onChange(newSelected);
  };

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            disabled={disabled}
          >
            <span>
              {selectedNames.length === 0 
                ? placeholder 
                : `${selectedNames.length} selected`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={selected.includes(option.id)}
              onCheckedChange={() => toggleOption(option.id)}
            >
              {option.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedNames.map((name, idx) => (
            <Badge key={idx} variant="secondary" className="pr-1">
              <span className="mr-1">{name}</span>
              <button
                onClick={() => toggleOption(selected[idx])}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Step 2: Update Edit User Form Schema

**File**: `crm-fe-main/src/app/(global)/global/users/[id]/edit/page.tsx`

### Change 1: Update the schema (Line 87-88)

**OLD:**
```typescript
const editUserSchema = z.object({
  // ...
  departmentId: z.string().optional(),
  // ...
});
```

**NEW:**
```typescript
const editUserSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role: z.enum(["admin", "manager", "employee"]),
  departmentIds: z.array(z.string()).optional(),  // CHANGED: Now a UUID array
  departmentId: z.string().optional(),  // KEEP for backward compatibility
  isActive: z.boolean(),
  jobTitle: z.string().optional(),
  shiftType: z.enum(["day_shift", "night_shift"]).optional(),
  currentCtc: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().positive("CTC must be positive").optional(),
  ),
  basicPct: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().min(0).max(100).optional(),
  ),
  hraPct: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().min(0).max(100).optional(),
  ),
  allowancePct: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().min(0).max(100).optional(),
  ),
});
```

### Change 2: Update form initialization (Line 183-191)

**OLD:**
```typescript
values: userData
  ? {
      fullName: userData.fullName || "",
      email: userData.email || "",
      phone: userData.phone || "",
      role: userData.role as "admin" | "manager" | "employee",
      departmentId: userData.departmentId || "",
      isActive: userData.isActive ?? true,
```

**NEW:**
```typescript
values: userData
  ? {
      fullName: userData.fullName || "",
      email: userData.email || "",
      phone: userData.phone || "",
      role: userData.role as "admin" | "manager" | "employee",
      departmentIds: userData.departmentIds || [],  // ADDED: Load all departments
      departmentId: userData.departmentId || "",    // Keep for backward compat
      isActive: userData.isActive ?? true,
```

### Change 3: Add import for MultiSelect (Line 1-50)

**OLD:**
```typescript
import { Badge } from "@/components/ui/badge";
// ... other imports
```

**NEW:**
```typescript
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";  // ADD THIS
// ... other imports
```

### Change 4: Update watch variable (around Line 203-207)

**OLD:**
```typescript
const currentDepartmentId = watch("departmentId");
```

**NEW:**
```typescript
const currentDepartmentIds = watch("departmentIds");  // ADDED
const currentDepartmentId = watch("departmentId");     // Keep for backward compat
```

### Change 5: Update availableJobTitles logic (around Line 216-228)

**OLD:**
```typescript
// Get job titles based on selected department and role
const availableJobTitles = useMemo(() => {
  if (!currentDepartmentSlug) return [];
  const deptConfig = DEPARTMENT_JOB_TITLES[currentDepartmentSlug];
  if (!deptConfig) return [];

  // Explicitly cast currentRole to ensure type safety, though zod schema enforces it
  const role = currentRole as "manager" | "employee";
  return role === "manager" ? deptConfig.manager : deptConfig.employee;
}, [currentDepartmentSlug, currentRole]);
```

**NEW:**
```typescript
// Get job titles based on selected departments and role
const availableJobTitles = useMemo(() => {
  if (!currentDepartmentIds || currentDepartmentIds.length === 0) return [];
  
  // Collect job titles from ALL selected departments
  const titleSet = new Set<{ value: string; label: string }>();
  const titleMap = new Map<string, { value: string; label: string }>();
  
  for (const deptId of currentDepartmentIds) {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) continue;
    
    const deptConfig = DEPARTMENT_JOB_TITLES[dept.slug];
    if (!deptConfig) continue;
    
    const role = currentRole as "manager" | "employee";
    const titles = role === "manager" ? deptConfig.manager : deptConfig.employee;
    titles.forEach((t) => {
      if (!titleMap.has(t.value)) {
        titleMap.set(t.value, t);
      }
    });
  }
  
  return Array.from(titleMap.values());
}, [currentDepartmentIds, departments, currentRole]);
```

### Change 6: Replace Department Select with MultiSelect (Line 568-583)

**OLD:**
```typescript
{/* Department - only for non-admin */}
{currentRole !== "admin" && (
  <div className="space-y-2">
    <Label htmlFor="departmentId">Department</Label>
    <Select
      value={currentDepartmentId || "none"}
      onValueChange={(v) => setValue("departmentId", v)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

**NEW:**
```typescript
{/* Departments - multi-select for non-admin */}
{currentRole !== "admin" && (
  <div className="space-y-2">
    <Label htmlFor="departmentIds">Departments</Label>
    <MultiSelect
      options={departments.map((d) => ({ id: d.id, name: d.name }))}
      selected={currentDepartmentIds || []}
      onChange={(selected) => setValue("departmentIds", selected)}
      placeholder="Select departments"
    />
  </div>
)}
```

### Change 7: Update form submit handler (around Line 480-500)

**OLD:**
```typescript
const onSubmit = async (data: EditUserFormData) => {
  setIsSubmitting(true);
  try {
    await usersApi.update(userId, {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      departmentId: data.departmentId,  // Single department
      isActive: data.isActive,
      // ... other fields
    });
    toast.success("User updated successfully");
    router.push("/global/users");
```

**NEW:**
```typescript
const onSubmit = async (data: EditUserFormData) => {
  setIsSubmitting(true);
  try {
    await usersApi.update(userId, {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      departmentIds: data.departmentIds || [],  // ADDED: Multiple departments
      departmentId: data.departmentIds?.[0],     // Set first as "primary" for backward compat
      isActive: data.isActive,
      // ... other fields
    });
    toast.success("User updated successfully");
    router.push("/global/users");
```

## Step 3: Update New User Form

**File**: `crm-fe-main/src/app/(global)/global/new/page.tsx`

Apply the same changes:
1. Add MultiSelect import
2. Update schema: `departmentIds: z.array(z.string()).min(1, "Select at least one department")`
3. Replace single department Select with MultiSelect
4. Update submission to pass departmentIds array

## Step 4: Display Departments in Users List

**File**: `crm-fe-main/src/app/(global)/global/users/page.tsx`

Find the table column rendering departments and update it:

**OLD:**
```typescript
<TableCell>
  {user.departmentId ? (
    <Badge variant="outline">
      {departments.find((d) => d.id === user.departmentId)?.name}
    </Badge>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>
```

**NEW:**
```typescript
<TableCell>
  <div className="flex flex-wrap gap-1">
    {user.departmentIds && user.departmentIds.length > 0 ? (
      user.departmentIds.map((deptId) => {
        const dept = departments.find((d) => d.id === deptId);
        return (
          <Badge key={deptId} variant="outline">
            {dept?.name}
          </Badge>
        );
      })
    ) : (
      <span className="text-muted-foreground">-</span>
    )}
  </div>
</TableCell>
```

## Step 5: Update Bulk Edit

**File**: `crm-fe-main/src/app/(global)/global/users/page.tsx`

In the bulk edit section:

### Update bulkDrafts initialization
```typescript
const next: Record<string, any> = {};
for (const user of selectedUsers) {
  next[user.id] = {
    // ... other fields
    departmentIds: (user as any).departmentIds || [],  // CHANGED from departmentId
  };
}
```

### Add MultiSelect to bulk edit table
```typescript
// In the table rendering for bulk edit:
<TableCell>
  <MultiSelect
    options={departments.map((d) => ({ id: d.id, name: d.name }))}
    selected={bulkDrafts[user.id]?.departmentIds || []}
    onChange={(selected) => 
      setDraftField(user.id, "departmentIds", selected)
    }
    placeholder="Depts"
  />
</TableCell>
```

## Step 6: Update User Detail Page

**File**: `crm-fe-main/src/app/(global)/global/users/[id]/page.tsx`

Find where user.departmentId is displayed and add:

```typescript
{/* Display all departments */}
{(user as any).departmentIds && (user as any).departmentIds.length > 0 ? (
  <div className="space-y-2">
    <p className="text-sm text-muted-foreground">Departments</p>
    <div className="flex flex-wrap gap-2">
      {(user as any).departmentIds.map((deptId: string) => {
        const dept = departments.find((d) => d.id === deptId);
        return (
          <Badge key={deptId} variant="secondary">
            {dept?.name}
          </Badge>
        );
      })}
    </div>
  </div>
) : null}
```

## Testing Checklist

- [ ] Create new user with multiple departments
- [ ] Edit user to add/remove departments
- [ ] Verify departmentIds array appears in API requests
- [ ] List view shows all departments as badges
- [ ] Bulk edit includes multi-department selector
- [ ] Job titles update based on all selected departments
- [ ] User detail view displays all departments
- [ ] Filtering by department still works (should show users with department in any of their departmentIds)

## Quick Implementation Order

1. **Create MultiSelect component** (Step 1) - Required by everything
2. **Update Edit User form** (Step 2) - Most important user interaction
3. **Update New User form** (Step 3) - Essential for creation
4. **Update list display** (Step 4) - Visibility of multi-departments
5. **Update bulk edit** (Step 5) - Advanced feature
6. **Update detail page** (Step 6) - Nice to have

Start with Steps 1-2, test thoroughly, then proceed with others.
