# Quick Reference Card - Multi-Department Users Implementation

## What Changed

| Aspect | Before | After |
|--------|--------|-------|
| Department Model | Single `departmentId` per user | Array `departmentIds` + primary `departmentId` |
| Job Title | One per user | One per user (global), but filters from all departments |
| Database | Single FK in users table | Junction table `user_departments` + FK in users |
| API Response | `{..., departmentId: "123", ...}` | `{..., departmentId: "123", departmentIds: ["123", "456"], ...}` |
| UI Components | Single Select | MultiSelect dropdown with badges |
| Filtering | Filter by single department | Filter by any of user's departments |

## Core Files to Modify

```
crm-fe-main/src/
├── components/ui/
│   └── multi-select.tsx                                 [CREATE NEW]
├── app/(global)/global/
│   ├── users/
│   │   ├── [id]/
│   │   │   ├── edit/page.tsx                           [MODIFY: ~50 lines]
│   │   │   └── page.tsx                                [MODIFY: Detail view]
│   │   └── page.tsx                                    [MODIFY: List display + bulk edit]
│   └── new/page.tsx                                    [MODIFY: ~20 lines]
```

## Implementation Sequence

```
Step 1: Create MultiSelect Component (5 min)
  └─→ Required by all forms
  
Step 2: Update Edit User Form (15 min)
  ├─→ Add import: MultiSelect
  ├─→ Update schema: departmentIds: z.array(z.string())
  ├─→ Update values: departmentIds: userData.departmentIds || []
  ├─→ Update watch: const currentDepartmentIds = watch("departmentIds")
  ├─→ Update job titles logic to use all departments
  ├─→ Replace Select with MultiSelect
  └─→ Update submit: Pass departmentIds array
  
Step 3: Update New User Form (10 min)
  └─→ Same changes as Step 2
  
Step 4: Update List Display (10 min)
  ├─→ Show all departments as badges
  ├─→ Update bulk edit modal multi-select
  └─→ Test filtering works
  
Step 5: Update Detail Page (5 min)
  └─→ Display all departments as badges
  
Step 6: Test & Iterate (ongoing)
  └─→ Follow testing checklist in API_AND_TESTING_GUIDE.md
```

## Code Snippets (Copy-Paste)

### Import MultiSelect
```typescript
import { MultiSelect } from "@/components/ui/multi-select";
```

### Schema Change
```typescript
// OLD:
departmentId: z.string().optional(),

// NEW:
departmentIds: z.array(z.string()).optional(),
departmentId: z.string().optional(),  // Keep for backward compat
```

### Form Initialize
```typescript
// OLD:
departmentId: userData.departmentId || "",

// NEW:
departmentIds: userData.departmentIds || [],
departmentId: userData.departmentId || "",
```

### Watch Variable
```typescript
// OLD:
const currentDepartmentId = watch("departmentId");

// NEW:
const currentDepartmentIds = watch("departmentIds");
const currentDepartmentId = watch("departmentId");
```

### Replace Select Component
```typescript
// OLD:
<Select value={currentDepartmentId || "none"} onValueChange={(v) => setValue("departmentId", v)}>
  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="none">None</SelectItem>
    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
  </SelectContent>
</Select>

// NEW:
<MultiSelect
  options={departments.map((d) => ({ id: d.id, name: d.name }))}
  selected={currentDepartmentIds || []}
  onChange={(selected) => setValue("departmentIds", selected)}
  placeholder="Select departments"
/>
```

### API Submission
```typescript
// OLD:
await usersApi.update(userId, {
  departmentId: data.departmentId,
  // ...
});

// NEW:
await usersApi.update(userId, {
  departmentIds: data.departmentIds || [],
  departmentId: data.departmentIds?.[0],  // First = primary
  // ...
});
```

### List Display
```typescript
// OLD:
<TableCell>
  {user.departmentId ? (
    <Badge>{departments.find(d => d.id === user.departmentId)?.name}</Badge>
  ) : <span className="text-muted-foreground">-</span>}
</TableCell>

// NEW:
<TableCell>
  <div className="flex flex-wrap gap-1">
    {user.departmentIds && user.departmentIds.length > 0 ? (
      user.departmentIds.map(deptId => (
        <Badge key={deptId} variant="outline">
          {departments.find(d => d.id === deptId)?.name}
        </Badge>
      ))
    ) : <span className="text-muted-foreground">-</span>}
  </div>
</TableCell>
```

## Common Mistakes to Avoid

❌ **DON'T**: Remove the old `departmentId` field
  ✅ DO: Keep both for backward compatibility

❌ **DON'T**: Forget to pass `departmentIds` as array to API
  ✅ DO: Use `data.departmentIds || []` in submissions

❌ **DON'T**: Update job titles to only use first department
  ✅ DO: Collect job titles from ALL selected departments

❌ **DON'T**: Change database before running migration
  ✅ DO: Ensure migration 062 is applied first

❌ **DON'T**: Remove MultiSelect import
  ✅ DO: Import at top of component file

## Verification Checklist

- [ ] MultiSelect component works (can select multiple items)
- [ ] departmentIds appears in form submission (Network tab)
- [ ] API returns departmentIds as array
- [ ] List shows all departments as badges
- [ ] Job titles include options from all selected departments
- [ ] Filtering works (shows all users with department)
- [ ] Bulk edit can set multiple departments
- [ ] Detail page displays all departments
- [ ] No errors in browser console
- [ ] No TypeScript compilation errors

## Quick Commands

```bash
# Backend - ensure migration is applied
cd crm-be-Main
pnpm run migrate

# Frontend - check for TypeScript errors
cd crm-fe-main
pnpm lint

# Test API locally
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/users/USER_ID | jq '.departmentIds'
```

## Getting Help

**If departmentIds not appearing:**
1. Check API response in Network tab (does it include departmentIds?)
2. Check backend migration ran successfully
3. Query database: `SELECT * FROM user_departments;`

**If MultiSelect not showing:**
1. Verify component file exists: `components/ui/multi-select.tsx`
2. Check import statement in form file
3. Check DropdownMenu components are available

**If job titles wrong:**
1. Log `availableJobTitles` to see generated list
2. Check DEPARTMENT_JOB_TITLES mapping includes all departments
3. Verify currentDepartmentIds watch variable has values

**If submit fails:**
1. Check browser console for form errors
2. Check Network tab for API error response
3. Verify schema validation passes

## Timeline Estimate

| Task | Time | Dependencies |
|------|------|--------------|
| Create MultiSelect component | 5 min | None |
| Update Edit User form | 15 min | MultiSelect |
| Update New User form | 10 min | MultiSelect, edit form pattern |
| Update List display | 10 min | MultiSelect ready |
| Update Detail page | 5 min | Any of above |
| Testing & debugging | 20-40 min | All above |
| **Total** | **60-85 min** | Sequential |

**Recommendation**: Implement Steps 1-2 today, test thoroughly, then proceed with Steps 3-5.
