# Multi-Department Users - Frontend Implementation Guide

## Overview
This guide walks through implementing multi-department support on the frontend. The backend is ready and supports `departmentIds` array on users.

## 1. Update Frontend User Type

**File**: `crm-fe-main/src/types/index.ts`

Already updated to include:
```typescript
departmentIds?: string[];  // Multiple departments
```

## 2. Multi-Select Component Helper

**Create**: `crm-fe-main/src/components/ui/multi-select.tsx` (if not exists)

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
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
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
          <Button variant="outline" className="w-full justify-between">
            <span>{selectedNames.length === 0 ? placeholder : `${selectedNames.length} selected`}</span>
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

## 3. Update User Edit Form

**File**: `crm-fe-main/src/app/(global)/global/users/[id]/edit/page.tsx`

### Step 1: Update the schema
```typescript
const editUserSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role: z.enum(["admin", "manager", "employee"]),
  departmentIds: z.array(z.string()).optional(),  // Changed from single to array
  isActive: z.boolean(),
  jobTitle: z.string().optional(),
  shiftType: z.enum(["day_shift", "night_shift"]).optional(),
  currentCtc: z.preprocess(/* ... */),
  basicPct: z.preprocess(/* ... */),
  hraPct: z.preprocess(/* ... */),
  allowancePct: z.preprocess(/* ... */),
});
```

### Step 2: Update form values initialization
```typescript
const {
  register,
  handleSubmit,
  setValue,
  watch,
  formState: { errors },
} = useForm<EditUserFormData>({
  resolver: zodResolver(editUserSchema),
  values: userData
    ? {
        fullName: userData.fullName || "",
        email: userData.email || "",
        phone: userData.phone || "",
        role: userData.role as "admin" | "manager" | "employee",
        departmentIds: userData.departmentIds || [],  // Changed to array
        isActive: userData.isActive ?? true,
        jobTitle: userData.jobTitle || "",
        shiftType: (userData.shiftType as "day_shift" | "night_shift") || "day_shift",
        currentCtc: userData.currentCtc ?? undefined,
        basicPct: userData.salaryComponents?.basic_pct ?? 50,
        hraPct: userData.salaryComponents?.hra_pct ?? 20,
        allowancePct: userData.salaryComponents?.allowance_pct ?? 30,
      }
    : undefined,
});

const currentDepartmentIds = watch("departmentIds");
```

### Step 3: Replace single department select with multi-select
```typescript
// In the JSX, replace:
/*
<Select value={currentDepartmentId} onValueChange={(v) => setValue("departmentId", v)}>
  ...
</Select>
*/

// With:
<MultiSelect
  options={departments.map((d) => ({ id: d.id, name: d.name }))}
  selected={currentDepartmentIds || []}
  onChange={(selected) => setValue("departmentIds", selected)}
  placeholder="Select departments"
/>
```

### Step 4: Update job title logic for multiple departments
```typescript
// Get unique job titles across all selected departments
const availableJobTitles = useMemo(() => {
  if (!currentDepartmentIds || currentDepartmentIds.length === 0) return [];
  
  const titleSet = new Set<string>();
  for (const deptId of currentDepartmentIds) {
    const dept = departments.find((d) => d.id === deptId);
    const slug = dept?.slug;
    if (slug) {
      const deptConfig = DEPARTMENT_JOB_TITLES[slug];
      if (deptConfig) {
        const role = currentRole as "manager" | "employee";
        const titles = role === "manager" ? deptConfig.manager : deptConfig.employee;
        titles.forEach((t) => titleSet.add(t.value));
      }
    }
  }
  return Array.from(titleSet).map((t) => ({
    value: t,
    label: formatTitleLabel(t),
  }));
}, [currentDepartmentIds, departments, currentRole]);
```

### Step 5: Update submit handler
```typescript
const onSubmit = async (data: EditUserFormData) => {
  setIsSubmitting(true);
  try {
    await usersApi.update(userId, {
      ...data,
      departmentIds: data.departmentIds || [],  // Ensure array is passed
    });
    toast.success("User updated successfully");
    router.push("/global/users");
  } catch (error: any) {
    toast.error(error.response?.data?.error?.message || "Failed to update user");
  } finally {
    setIsSubmitting(false);
  }
};
```

## 4. Update New User Form

**File**: `crm-fe-main/src/app/(global)/global/new/page.tsx`

Similar changes as the edit form:
1. Update schema: `departmentIds: z.array(z.string()).min(1, "Select at least one department")`
2. Use MultiSelect component instead of single Select
3. Update job title filtering logic

## 5. Update Bulk Edit Users

**File**: `crm-fe-main/src/app/(global)/global/users/page.tsx`

### Update bulk draft state
```typescript
const [bulkDrafts, setBulkDrafts] = useState<
  Record<
    string,
    {
      email: string;
      fullName: string;
      phone: string;
      role: string;
      departmentIds: string[];          // Changed to array
      teamId: string;
      managerId: string;
      jobTitle: string;
      shiftType: string;
      currentCtc: string;
      basicPct: string;
      hraPct: string;
      allowancePct: string;
      isActive: boolean;
    }
  }>({});
```

### Update bulk draft initialization
```typescript
// In the useEffect that syncs selectedUsers to bulkDrafts:
const next: Record<string, /* ... */> = {};
for (const user of selectedUsers) {
  next[user.id] = {
    // ... other fields
    departmentIds: user.departmentIds || [],  // Changed to array
    // ... rest of fields
  };
}
```

### Add multi-select column to bulk table
```typescript
// In the bulk edit table, add a column:
<TableCell>
  <MultiSelect
    options={departmentOptions}
    selected={bulkDrafts[user.id]?.departmentIds || []}
    onChange={(selected) => setDraftField(user.id, "departmentIds", selected)}
    placeholder="Departments"
  />
</TableCell>
```

## 6. Update User Display

**File**: `crm-fe-main/src/app/(global)/global/users/page.tsx` (table display)

```typescript
// Update the Department column in the table:
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

## 7. Update User Detail Page

**File**: `crm-fe-main/src/app/(global)/global/users/[id]/page.tsx`

```typescript
// Display all departments:
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

## 8. Update Filtering

**File**: `crm-fe-main/src/app/(global)/global/users/page.tsx`

The existing department filter should already work, but consider enhancing it to show that it filters across all user departments:

```typescript
// When filtering by department, users with that department in departmentIds will appear
// No code change needed - backend already handles this via the user_departments table
```

## 9. Update API Types (if needed)

**File**: `crm-fe-main/src/lib/api.ts`

The API client should already support departmentIds through the schema inference. If you need explicit typing:

```typescript
export interface UserUpdatePayload {
  // ... existing fields
  departmentIds?: string[];
  departmentSpecificData?: Array<{
    departmentId: string;
    jobTitle?: string | null;
    shiftType?: string | null;
  }>;
}
```

## Testing Checklist

- [ ] Create a new user with multiple departments
- [ ] Edit existing user to add multiple departments
- [ ] Verify departmentIds appear in user list and detail view
- [ ] Test bulk edit with multi-department selection
- [ ] Verify filtering works across all user departments
- [ ] Test that job title options update based on selected departments
- [ ] Verify department-specific data is saved correctly
- [ ] Test permission cascade from all assigned departments
- [ ] Ensure backward compatibility with single department assignments

## Troubleshooting

### departmentIds not appearing in responses
- Ensure backend migration is run: `062_multi_department_users.sql`
- Check that `getUserById()` and `getUsers()` were updated to fetch from `user_departments` table
- Verify the user_departments table has records for the user

### Multi-select not working
- Ensure shadcn/ui DropdownMenu components are available
- Check that the MultiSelect component is properly imported
- Verify department options are being passed correctly

### Job titles not filtering correctly
- Make sure DEPARTMENT_JOB_TITLES matches the department slugs in the database
- Verify that all selected departments have job title configurations

## Additional Enhancements (Future)

1. **Department-Specific Settings**: Show/edit department-specific job_title and shift_type per department
2. **Department Primary Indicator**: Visual indicator showing which department is primary
3. **Advanced Filtering**: Filter users by multiple specific departments
4. **Bulk Import**: CSV import with multi-department support
5. **Permissions Matrix**: Show which permissions come from which departments
