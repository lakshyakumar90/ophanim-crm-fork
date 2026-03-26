# HR Simplification - Database Redundancy Analysis

## Summary
After removing Recruitment, Onboarding, Document Expiry, and Leaves Management features, the following analysis identifies which database tables and columns remain active and which are now potentially redundant.

## Current Status: MIGRATION NOT REQUIRED ✅

All backend database operations have been cleaned up. The database schema remains intact but is no longer actively used in certain areas.

---

## Tables & Columns Analysis

### ✅ TABLES STILL IN USE (Keep As-Is)

#### Leaves Module Tables
| Table | Status | Purpose | Still Used? |
|-------|--------|---------|------------|
| `leave_types` | Keep | Stores leave type definitions (Casual, Sick, Annual, etc.) | ✅ YES - FK reference, used in APIs |
| `leave_requests` | Keep | Stores employee leave requests | ✅ YES - Core functionality |
| `leave_balances` | Keep | Tracks leave balance per employee/type | ✅ YES - Auto-updated via trigger |
| `leave_summary` | Keep | Summary view for team leave planning | ✅ YES - Team calendar uses this |

#### HR Documents
| Table | Status | Purpose | Still Used? |
|-------|--------|---------|------------|
| `employee_documents` | Keep | Stores employee documents with verification status | ✅ YES - Verification workflow intact |

#### Other HR Tables
| Table | Status | Purpose | Still Used? |
|-------|--------|---------|------------|
| `offboarding_checklists` | Keep | Offboarding tasks (shares infrastructure with onboarding) | ✅ YES - Offboarding page active |
| `offboarding_templates` | Keep | Offboarding templates | ✅ YES - Used in offboarding flow |

---

## ❌ POTENTIALLY REMOVED/UNUSED TABLES

The following tables **may exist in the database** but are **no longer referenced in code**:

| Table | Was Used For | Status | Recommendation |
|-------|-------------|--------|-----------------|
| `job_postings` | Recruitment - Create job posts | ❌ NOT IN CODE | Can be dropped (no data accessed) |
| `candidates` | Recruitment - Store candidates | ❌ NOT IN CODE | Can be dropped (no data accessed) |
| `interviews` | Recruitment - Interview tracking | ❌ NOT IN CODE | Can be dropped (no data accessed) |
| `offers` | Recruitment - Offer management | ❌ NOT IN CODE | Can be dropped (no data accessed) |
| `onboarding_checklists` (type='onboarding') | Onboarding workflow | ⚠️ PARTIAL | Only offboarding type is used |
| `onboarding_templates` (type='onboarding') | Onboarding templates | ⚠️ PARTIAL | Only offboarding type is used |

---

## 🗑️ REMOVED DB COLUMNS

### `employee_documents` Table
- **Column removed (in code):** `expiry_date` 
  - **Status:** Column likely still exists in DB but no longer written/read
  - **Impact:** Safe to keep (backward compatible) or can be dropped in separate migration
  - **Action:** Can be removed in a future "clean schema" migration if needed

---

## ⚡ Active Triggers (Keep)

| Trigger | Purpose | Dependencies |
|---------|---------|---|
| `update_leave_balance_on_approval` | Auto-updates `leave_balances.used_days` when leave is approved/rejected | Payroll calculations depend on this |
| `set_leave_type_id` | Auto-sets leave_type_id when leave request created | Leave request workflow |

**Note:** These triggers remain ACTIVE and REQUIRED for leave workflow to function correctly.

---

## 🔧 Migration Plan

### Phase 1: Code Cleanup ✅ COMPLETE
- ✅ Removed all recruitment routes, services, validators
- ✅ Removed all onboarding routes, services, validators  
- ✅ Removed document expiry from UI and all APIs
- ✅ Removed leaves management UI (balances, settings tabs)
- ✅ Made `leaveTypeId` optional in leave requests
- ✅ All frontend/backend code cleaned - **No orphaned code remains**

### Phase 2: Optional - Database Schema Cleanup (FUTURE)

**If you want to clean the database to remove unused tables:**

```sql
-- DROP RECRUITMENT TABLES (after ensuring no data dependencies)
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS job_postings CASCADE;

-- DROP ONBOARDING RECORDS (optional - keeps offboarding)
DELETE FROM onboarding_checklists WHERE type = 'onboarding';
DELETE FROM onboarding_templates WHERE type = 'onboarding';

-- REMOVE DOCUMENT EXPIRY COLUMN (optional - backward compatible to keep)
ALTER TABLE employee_documents DROP COLUMN IF EXISTS expiry_date;
```

**⚠️ Important:** Do NOT execute these unless you:
1. Have verified no external dependencies
2. Have a database backup
3. Are certain no recruitment/onboarding references exist in other systems

### Phase 3: Recommended - Add Migration File

Create `crm-be-Main/supabase/migrations/065_remove_unused_tables.sql`:

```sql
-- Remove recruitment tables and onboarding data
-- COMMENTED OUT: This is a data-destructive migration. 
-- Uncomment only after verifying no dependencies exist.

-- DROP TABLE offers CASCADE;
-- DROP TABLE interviews CASCADE;
-- DROP TABLE candidates CASCADE;
-- DROP TABLE job_postings CASCADE;

-- DELETE FROM onboarding_checklists WHERE type = 'onboarding';
-- DELETE FROM onboarding_templates WHERE type = 'onboarding';

-- ALTER TABLE employee_documents DROP COLUMN expiry_date;
```

---

## 🎯 Current Architecture Summary

### Active Features
- **Leaves:** ✅ Request submission, approval workflow, balance tracking
- **HR Documents:** ✅ Upload, verify, manage (no expiry)
- **Offboarding:** ✅ Checklists and templates
- **Payroll:** ✅ Depends on leave balance triggers (DO NOT BREAK)

### Removed Features
- ❌ Recruitment (job postings, candidates, interviews, offers)
- ❌ Onboarding (checklists, templates - kept offboarding only)
- ❌ Document expiry tracking
- ❌ Leave balance/type management UI

---

## ✨ Next Steps

**Immediate (DONE):**
- Code cleanup and validation ✅
- Frontend/backend builds pass ✅
- All imports cleaned ✅
- Git checkpoint created ✅

**Optional (Future):**
- Archive recruitment tables (not dropped, just disable access)
- Remove onboarding data from shared checklist tables
- Add comment-only migration for data cleanup options

**No Action Needed:**
- Leave triggers, tables, and infrastructure - all working perfectly
- Database continues to function with all leave features intact

---

## 🔍 Verification Checklist

- ✅ Recruitment code completely removed
- ✅ Onboarding code completely removed (offboarding kept)
- ✅ Document expiry UI completely removed
- ✅ Leaves UI simplified (balances/settings gone)
- ✅ Backend validators updated (leaveTypeId optional)
- ✅ All builds pass (frontend + backend TypeScript)
- ✅ No orphaned imports or unused code
- ✅ Leave workflow still functional
- ✅ Offboarding workflow still functional
- ✅ Document verification workflow still functional

---

**Migration Branch:** `hr-simplification-1774502723`
**Last Updated:** Phase 7 complete
