# 🔧 Apply Migration 053: Fix RLS Recursion

## Problem
Your `/tasks` API endpoint returns **500 error (42P17)** due to infinite recursion in RLS policies between `projects` and `project_members` tables.

## Solution  
Apply **Migration 053** to break the circular RLS dependency using SECURITY DEFINER helper functions.

## How to Apply (Choose ONE method)

### ✅ Method 1: Supabase Web UI (EASIEST)

1. Go to your Supabase project: https://app.supabase.com/
2. Select your project from the list
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Copy the SQL from: `crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql`
6. Paste it into the editor
7. Click **Run** (or Cmd/Ctrl + Enter)
8. Wait for completion ✅

**Expected Result:**
- No errors shown
- All statements execute successfully

---

### 🔄 Method 2: Supabase CLI

```bash
cd crm-be-Main
supabase migration up
```

This automatically applies all pending migrations including 053.

---

### 📝 Method 3: Direct SQL Copy-Paste

If Methods 1-2 don't work, manually execute this SQL in Supabase SQL Editor:

```sql
-- Copy everything from 053_fix_rls_recursion.sql
-- Paste into Supabase SQL Editor and run
```

---

## ✅ Verify the Fix

After applying migration 053, test your API:

```bash
# Run your tasks query in browser or API client
curl "https://prwmuapkqqunfiyvrctz.supabase.co/rest/v1/tasks?select=*&limit=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- ✅ Status 200 (not 500)
- ✅ Returns tasks data

---

## 🔍 What Migration 053 Does

| Component | Before | After |
|-----------|--------|-------|
| **projects_select_policy** | ❌ Queries project_members directly → recursion | ✅ Uses `is_project_member()` SECURITY DEFINER helper |
| **project_members_select_policy** | ❌ Queries projects directly → recursion | ✅ Uses `is_project_manager_of()` helper |
| **project_files_select_policy** | ❌ Recursive queries | ✅ Uses helpers |
| **project_notes_select_policy** | ❌ Recursive queries | ✅ Uses helpers |
| **tasks_select_policy** | ❌ Can't see project tasks | ✅ Allows project members via helpers |

---

## 🆘 Troubleshooting

### "Function does not exist"
- Migration helpers may not have created properly
- **Solution**: Go back to Method 1 and run the entire migration again

### "Still getting 500 error"
- Migration didn't apply
- **Solution**: Go to Supabase SQL Editor → check "Migrations" tab → see if 053 is listed

### Query works locally but not in production
- Supabase database hasn't synced yet
- **Solution**: Wait 2-3 minutes, then try again

---

## 📚 Reference

- **Migration file**: `crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql`
- **Error code**: 42P17 (PostgreSQL infinite recursion detection)
- **Root cause**: Circular RLS policy dependencies
- **Root cause article**: https://www.postgresql.org/docs/current/sql-createpolicy.html

Done! Your tasks API should now work without 500 errors! 🎉
