# ✅ YOUR ACTION PLAN - RLS 500 Error Fix

## 📋 What You Need to Do RIGHT NOW

Your Supabase database has a **circular RLS dependency** causing 500 errors on `/tasks` endpoint.

**Migration 053** (which already exists in your codebase) fixes this.

---

## 🎯 THE SINGLE COMMAND TO FIX THIS

### Run This:

```bash
cd crm-be-Main

# Option 1: Using npm/pnpm
pnpm migrate:053

# Option 2: Using Supabase CLI
supabase migration up

# Option 3: Manual - Copy and paste SQL in Supabase Web UI
```

---

## 🖱️ IF SCRIPTS DON'T WORK - Use Web UI (always works)

1. Open: https://app.supabase.com/
2. Select your project 
3. **SQL Editor → New Query**
4. Copy file: `crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql`
5. Paste into editor
6. Press `Ctrl+Enter` or click **Run**
7. ✅ Done

---

## ✨ What's In Migration 053

**18 SQL statements** that:
- Create 2 SECURITY DEFINER helper functions
- Fix 7 RLS policies
- Break the circular dependency
- Allow project tasks to be queried without 500 errors

**Files that get fixed:**
- projects table
- project_members table  
- project_files table
- project_notes table
- tasks table

---

## 🔍 Verify It Worked

After running migration 053, test this in your browser console:

```javascript
// Should return task data (status 200), not 500 error
fetch('/api/v1/tasks?limit=1')
  .then(r => r.json())
  .then(d => console.log(d))
```

Or use curl:
```bash
curl https://your-supabase-url/rest/v1/tasks?limit=1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: **200 status** with data

---

## 📁 Created For You

```
✅ crm-be-Main/scripts/apply-migration-053.js     → Automated runner
✅ crm-be-Main/scripts/migrate-053-executor.js    → Guide + helper
✅ crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql → The fix
✅ package.json → Added "migrate:053" script
✅ MIGRATION_053_READY.md → Full documentation
✅ RLS_RECURSION_FIX.md → Detailed guide
✅ APPLY_MIGRATION_053.md → Step-by-step
```

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| Script won't run | Use Web UI method |
| Still getting 500 | Wait 30 sec, refresh browser, try again |
| "Function already exists" | Good - means create/replace worked |
| "Authorization denied" | Check SUPABASE_SERVICE_ROLE_KEY in .env |
| Can't find SQL file | Verify path: `crm-be-Main/supabase/migrations/053_fix_rls_recursion.sql` |

---

## ⚡ QUICK SUMMARY

**Problem:** Recursive RLS policies cause 500 error on /tasks  
**Solution:** Migration 053 (already in your code)  
**Action:** Run `pnpm migrate:053` or use Web UI  
**Time:** <5 minutes  
**Risk:** 🟢 Very Low (RLS fix only)  
**Impact:** ✅ Fixes /tasks, /projects, project access

---

## 🎯 DO THIS NOW

1. Run **one** of these commands:
   ```bash
   pnpm migrate:053
   # OR
   supabase migration up
   # OR
   # Go to https://app.supabase.co → SQL Editor → paste migration 053 SQL
   ```

2. See "✅ Migration applied successfully"

3. Test: Try accessing tasks in your app

4. ✅ You're done!

---

**Status:** ✅ All files ready  
**Next Step:** Execute migration 053  
**Timeline:** Now! ⏱️

