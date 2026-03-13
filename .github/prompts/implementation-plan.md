# CRM Implementation Plan

## Feature 1: Import Leads — All Statuses

**Problem:** `import-leads-dialog.tsx` hardcodes only `fresh_lead` / `cold_lead` in the "Import As" dropdown. The backend `csv.service.ts` line 287-290 also only passes the status override for those two values.

**Changes:**

### Frontend — `crm-fe-main/src/components/leads/import-leads-dialog.tsx`
- Replace the `importStatus` state type from `"fresh_lead" | "cold_lead"` to `LeadStatus` (import from `@/config/constants`)
- Replace the hardcoded two `<SelectItem>` entries with `getAllStatuses().map(...)` (already imported in the export dialog, just replicate the pattern)
- Update the `importStatus` default value to `"fresh_lead"`

### Backend — `crm-be-Main/src/services/csv.service.ts`
- On line 287-290, remove the `fresh_lead`/`cold_lead` guard. Validate the `defaultStatus` against `Object.values(LEAD_STATUSES)` and apply it for any valid status.

---

## Feature 2: Export Leads — All Fields

**Problem:** `exportLeads()` in `csv.service.ts` only selects ~18 fields. Missing: `timezone`, `nal_reason`, `client_response`, `lead_type`, `assigned_to` (user name), `alternate_phone` (already in model but not in SELECT), `pincode` (missing from SELECT and export mapping).

**Changes:**

### Backend — `crm-be-Main/src/services/csv.service.ts`
- Update the Supabase `.select()` query to include all lead fields:
  `id, lead_name, business_name, email, phone, alternate_phone, address, city, state, country, pincode, status, source, lead_value, industry, designation, website, description, tags, timezone, nal_reason, client_response, lead_type, assigned_to, created_at, updated_at`
  Plus join: `assignee:assigned_to(full_name)`
- Update the `exportData` mapping to include all newly added fields with safe csv text treatment
- Add `assigned_to_name: lead.assignee?.full_name || ""` in the export row
- Update the empty CSV header string to list all fields

---
## Feature 3: Lead Info Page — Clean UI With All Details

**Problem:** The detail page at `crm-fe-main/src/app/(sales)/[slug]/leads/[id]/page.tsx` does not show all lead fields (missing: `industry`, `designation`, `website`, `leadValue`, `timezone`, `nalReason`, `clientResponse`, `leadType`, UTM fields, course/webinar fields, `tags`, `alternatePhone`). The layout also needs a cleaner, more organised presentation.

**Changes:**

### Frontend — `crm-fe-main/src/app/(sales)/[slug]/leads/[id]/page.tsx`
- Reorganise the lead info section into labelled card sections:
  - **Contact Information**: name, email, phone, alternate phone, designation
  - **Business Details**: business name, industry, website, lead value, lead type, source
  - **Location**: address, city, state, country, pincode, timezone
  - **CRM Fields**: status, assigned to, created by, NAL reason, client response, tags
  - **Metadata**: created at, updated at, converted at
- Each field should use a consistent `FieldRow` pattern (icon + label + value) matching existing shadcn UI patterns
- Show "Not specified" / "—" for empty fields instead of blank
- Show tags as `<Badge>` chips
- Show timezone and industry with appropriate Lucide icons (Globe, Building2)
- The latest activity/update should be clearly shown at the top of the Activities tab

---

## Feature 4: Duplicate Lead Detection During Import

**Problem:** No duplicate detection exists. The system blindly inserts all rows.

### Step 4a — Backend: New endpoint `POST /csv/leads/check-duplicates`

File: `crm-be-Main/src/routes/csv.routes.ts`
- Add route: `POST /csv/leads/check-duplicates` — authenticate + validate + asyncHandler
- Accepts: `{ rows: Array<{email?, phone?, leadName}> }`
- Returns: for each row, whether a duplicate exists (by email OR phone) and the existing lead id/name

File: `crm-be-Main/src/services/csv.service.ts`
- Add function `checkDuplicates(rows)`:
  - Collect all emails and phones from the provided rows
  - Query `leads` table: `email IN (emails) OR phone IN (phones)` where `is_deleted = false`
  - Return a map: `{ email -> existingLead, phone -> existingLead }`

### Step 4b — Backend: Add `duplicate_action` param to import

File: `crm-be-Main/src/services/csv.service.ts`
- Extend `importLeads()` to accept `duplicateAction: 'skip' | 'update' | 'import_anyway'` per row (or a global default)
- Before inserting, check if email/phone already exists:
  - `skip`: exclude the row from insert
  - `update`: use `upsert` on email/phone as conflict target
  - `import_anyway`: insert without dedup check
### Step 4c — Database migration: `044_duplicate_leads.sql`

File: `crm-be-Main/supabase/migrations/044_duplicate_leads.sql`
```sql
CREATE TABLE IF NOT EXISTS duplicate_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  duplicate_lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  detected_at timestamptz DEFAULT now(),
  detection_method text CHECK (detection_method IN ('email', 'phone', 'manual')),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  resolution text CHECK (resolution IN ('merged', 'kept_both', 'deleted_duplicate')),
  notes text,
  UNIQUE(original_lead_id, duplicate_lead_id)
);
CREATE INDEX idx_duplicate_leads_original ON duplicate_leads(original_lead_id);
CREATE INDEX idx_duplicate_leads_resolved ON duplicate_leads(resolved) WHERE resolved = false;
```

### Step 4d — Frontend: Multi-step Import Dialog

File: `crm-fe-main/src/components/leads/import-leads-dialog.tsx`

Convert to a 3-step wizard:
- **Step 1 — Upload**: existing file upload UI + status + assignTo selectors
- **Step 2 — Preview**: parse the CSV client-side (already done with XLSX), call `POST /csv/leads/check-duplicates`, render a table showing all rows. Duplicate rows are highlighted with an amber warning badge. For each duplicate row, show a per-row action selector: Skip / Update Existing / Import Anyway. Show counts: X new, Y duplicates detected.
- **Step 3 — Confirm & Import**: summary view, then call the import API with duplicate actions

### Step 4e — Frontend: Admin Duplicate Leads Page

File: `crm-fe-main/src/app/(sales)/[slug]/leads/duplicates/page.tsx` (new file)
- Admin-only page (redirect non-admins)
- Fetches `GET /leads/duplicates` (new backend endpoint)
- Shows a table: Original Lead | Duplicate Lead | Detection Method | Detected At | Actions (Merge / Keep Both / Delete Duplicate)
- Add link to this page from the leads page header (admin-only button "Manage Duplicates")

File: `crm-be-Main/src/routes/leads.routes.ts`
- Add `GET /leads/duplicates` — admin only, returns paginated list of unresolved duplicate pairs
- Add `POST /leads/duplicates/:id/resolve` — admin only, accepts `resolution: 'merged' | 'kept_both' | 'deleted_duplicate'`

---

## Feature 5: Employee Edit Restrictions

**Problem:** Employees can currently edit any field. The requirement: employees may only edit `timezone`, `country`, and `address`. Admins can edit any field.

### Backend — `crm-be-Main/src/services/hr.service.ts`
- In `updateEmployeeProfile(id, data, requestingUser)`:
  - If `requestingUser.role === 'employee'` AND `requestingUser.id !== id`: throw forbidden
  - If `requestingUser.role === 'employee'` AND `requestingUser.id === id`: strip all keys from `data` except `timezone`, `country`, `address`
  - Managers editing their own or their team members: allow the same restricted fields as employees (adjust based on business rules if needed; default to employee-level restriction unless admin)
  - Admins: no restriction

### Backend — `crm-be-Main/src/validators/hr.validator.ts` (or leads.validator.ts)
- Ensure Zod schema for HR update accepts optional fields so partial updates work cleanly

### Frontend — `crm-fe-main/src/components/hr/employee-detail-modal.tsx`
- The current modal is read-only (view mode). It needs an edit mode.
- Add an "Edit" button visible to both admins and the employee viewing their own profile
- When in edit mode, show form fields:
  - Admin: all fields editable (full_name, email, job_title, department, team, role, is_active, timezone, country, address)
  - Employee (own profile): only timezone, country, address
- Use React Hook Form + Zod for the edit form
- On save, call `PUT /hr/employees/:id` with only the allowed fields

---

## Feature 6: Lead Actions Fix

**Problem:** Various lead actions (status change, activities, comments, bulk operations) may have broken API calls or missing UI handlers.

### Audit Checklist (investigate and fix each):

1. **Status change** — `PATCH /leads/:id/status`: ensure the frontend status selector in `[id]/page.tsx` calls `leadsApi.updateStatus(id, status)` and triggers SWR revalidation after success
2. **Add activity** — `POST /leads/:id/activities`: ensure the activity form submits with correct payload `{ type, description }` and input is validated (non-empty description)
3. **Add comment** — `POST /leads/:id/comments`: ensure comment submit calls `leadsApi.addComment` with correct body and revalidates
4. **Edit/delete comment** — `PUT /leads/:id/comments/:commentId` and `DELETE /leads/:id/comments/:commentId`: verify these endpoints exist and frontend calls them correctly
5. **Assign lead** — `POST /leads/:id/assign` or `PUT /leads/:id`: verify the admin-only assignee picker calls the correct endpoint and revalidates
6. **Bulk operations** — `POST /leads/bulk-assign`, `POST /leads/bulk-update`, `POST /leads/bulk-delete`: verify the `BulkEditLeadsDialog` passes correct IDs and payload format
7. **Delete lead** — `DELETE /leads/:id`: verify it navigates back to the list after success

Files to check and fix:
- `crm-fe-main/src/app/(sales)/[slug]/leads/[id]/page.tsx` — all action handlers
- `crm-fe-main/src/lib/api.ts` — `leadsApi` method signatures and endpoints
- `crm-be-Main/src/routes/leads.routes.ts` — route definitions
- `crm-be-Main/src/services/leads.service.ts` — service implementations

---

## Feature 7: Reminder Visibility Fix

**Problem:** `GET /leads/reminders/all` returns all reminders regardless of the requesting user's role. Non-admin users and non-owners see reminders they should not see.

### Backend — `crm-be-Main/src/routes/leads.routes.ts` & `crm-be-Main/src/services/leads.service.ts`

In the `getAllReminders` service function, add role-based filtering:
- `admin`: return all reminders (no filter)
- `manager` / `employee`: return only reminders where `user_id = requestingUser.id` OR `lead.assigned_to = requestingUser.id`

The query should join `lead_reminders` with `leads` to filter by `assigned_to`:
```sql
SELECT lr.*, l.lead_name, l.assigned_to
FROM lead_reminders lr
JOIN leads l ON l.id = lr.lead_id
WHERE lr.is_deleted = false
  AND (
    -- admin sees all (handled in code)
    lr.user_id = $userId         -- reminder was created by this user
    OR l.assigned_to = $userId   -- this user owns the lead
  )
```

### Frontend — `crm-fe-main/src/components/dashboard/today-reminders.tsx`
- This component fetches reminders for the dashboard. It already calls `leadsApi.getAllReminders` — no frontend change needed once the backend filter is in place.
- Verify error states are handled gracefully (empty state shown if no reminders)

### Frontend — `crm-fe-main/src/app/(sales)/[slug]/leads/[id]/page.tsx`
- The lead detail page shows reminders for that specific lead. This is fine as-is since it's scoped to one lead.
- Ensure reminders section only shows "Add Reminder" button to the lead owner and admins.

---

## Implementation Order

1. Feature 1 (Import Statuses) — small, isolated, low risk
2. Feature 2 (Export Fields) — small, isolated, low risk
3. Feature 7 (Reminder Visibility) — security fix, high priority
4. Feature 5 (Employee Edit Restrictions) — security/access control
5. Feature 3 (Lead Info UI) — UI-only, no schema changes
6. Feature 6 (Lead Actions Audit) — requires careful testing
7. Feature 4 (Duplicate Detection) — largest feature, new DB migration + multi-step UI

---

## Consistent UI Guidelines

- All new UI follows the existing shadcn/ui component patterns in `crm-fe-main/src/components/ui/`
- Forms use React Hook Form + Zod resolvers
- Toasts via Sonner (`toast.success`, `toast.error`)
- Icons from `lucide-react`
- Color coding follows `config/constants.ts` lead status colors
- Cards use `<Card><CardHeader><CardTitle>` + `<CardContent>` pattern
- Badges use appropriate variants: `default`, `secondary`, `outline`, `destructive`
- Loading states use `<Skeleton>` or `<Loader2 className="animate-spin">`
- Empty states show a centered muted text message with an icon
- All new pages visible to employees/managers/admins must check role from `useAuth()` / `useIsAdmin()` / `useIsManager()`
