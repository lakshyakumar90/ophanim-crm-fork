# 🔴 → 🟢 Fix Your 500 Error: RLS Recursion (Error 42P17)

## Your Issue
```
❌ GET /rest/v1/tasks
Status: 500 Internal Server Error
Error Code: 42P17
Message: infinite recursion detected in policy for relation "project_members"
```

## Root Cause Analysis

Your database has **recursive RLS policies**:

```
Task Query
↓
Joins: projects table  
↓
Executes: projects_select_policy
↓
This policy queries: project_members
↓
Executes: project_members_select_policy
↓
This policy queries: projects
↓
Infinite Loop! 💥
```

**Location:** `crm-be-Main/supabase/migrations/033_comprehensive_rls.sql` (lines 345-378)

---

## ✅ Solution: Apply Migration 053

Migration 053 breaks the circular dependency using **SECURITY DEFINER helper functions** that bypass RLS.

### File Location
```
crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql (200+ lines)
```

### What it does
✅ Creates `is_project_member()` helper function  
✅ Creates `is_project_manager_of()` helper function  
✅ Replaces all direct project queries with helper calls  
✅ Eliminates circular dependencies  
✅ Allows project members to see their tasks  

---

## 🚀 DO THIS NOW - Choose Your Method

### ⭐ EASIEST: Web UI (No command line needed)

1. **Open browser** → `https://app.supabase.com/`
2. **Select project** → Choose your project
3. **SQL Editor** → Click left sidebar "SQL Editor"
4. **Create query** → Click "+ New Query" button
5. **Copy SQL** → Open this file locally:
   ```
   crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql
   ```
   Copy ALL contents
6. **Paste** → Paste into SQL Editor
7. **Run** → Press `Ctrl+Enter` or click "Run"
8. **Wait** → Should complete in a few seconds
9. **✅ Done** → Your /tasks API will now work!

---

### 🔄 AUTOMATED: Run Migration Script

```bash
cd crm-be-Main
pnpm migrate:053
```

Expected output:
```
🚀 Applying Migration 053: Fix RLS Recursion
📍 Project: https://prwmuapkqqunfiyvrctz.supabase.co
📝 Found 28 SQL statements
[1/28] Executing: DROP POLICY IF EXISTS... ✅
[2/28] Executing: CREATE OR REPLACE FUNCTION... ✅
...
✅ Migration 053 has been applied!
```

---

### 📋 MANUAL: Copy-Paste SQL

If the above don't work, run this exact SQL in Supabase SQL Editor:

```sql
-- =====================================================
-- MIGRATION 053: Fix RLS Recursion (COPY ENTIRE FILE)
-- =====================================================

-- From: crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql
-- Copy the ENTIRE file contents and paste below
```

**Exact steps:**
1. Open: `crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql`
2. Select ALL (`Ctrl+A`)
3. Copy (`Ctrl+C`)
4. Go to Supabase SQL Editor
5. Create New Query
6. Paste (`Ctrl+V`)
7. Run (`Ctrl+Enter`)

---

## ✅ Verify the Fix

After applying migration 053:

### Test 1: API Call
```bash
curl -X GET \
  'https://prwmuapkqqunfiyvrctz.supabase.co/rest/v1/tasks?limit=1' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Expected: **Status 200** (not 500)

### Test 2: Browser
Try using your application's tasks page - should no longer show 500 errors

---

## 📊 What Gets Fixed

| Feature | Before | After |
|---------|--------|-------|
| /tasks endpoint | ❌ 500 error | ✅ Works |
| Project tasks | ❌ Not accessible | ✅ Members see their tasks |
| Project members | ❌ Recursion error | ✅ Loads perfectly |
| Project notes | ❌ Recursion error | ✅ Accessible |

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Still getting 500 error | Refresh browser, wait 30 seconds, try again |
| "Function already exists" | This is OK - means CREATE OR REPLACE worked |
| Script won't run | Use Web UI method instead (easiest) |
| .env file not found | See: `README.md` for environment setup |
| Authorization failed | Check SUPABASE_SERVICE_ROLE_KEY in .env |

---

## 📚 Technical Details

**Migration File:** `053_fix_rls_recursion.sql`  
**Lines:** ~200  
**Statements:** ~28  
**Duration:** <5 seconds  
**Rollback:** None needed (only creates/recreates functions and policies)  

**Helper Functions Created:**
- `public.is_project_member(p_project_id UUID)` - SECURITY DEFINER
- `public.is_project_manager_of(p_project_id UUID)` - SECURITY DEFINER

**Policies Updated:**
1. `projects_select_policy`
2. `project_members_select_policy`
3. `project_files_select_policy`
4. `project_files_insert_policy`
5. `project_files_delete_policy`
6. `project_notes_select_policy`
7. `tasks_select_policy`

---

## ✨ Done!

Your application should now work properly with projects and tasks! 🎉

**Need help?**
1. Check SQL Editor for errors
2. Verify migration file exists: `crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql`
3. This document is at: `APPLY_MIGRATION_053.md`

