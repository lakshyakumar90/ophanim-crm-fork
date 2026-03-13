import Papa from "papaparse";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  BULK_LIMITS,
} from "../config/constants.js";
import {
  getCurrentTimestamp,
  chunkArray,
  isValidEmail,
} from "../utils/helpers.js";
import type { AuthUser } from "../types/api.types.js";

interface CsvLeadRow {
  lead_name?: string;
  leadName?: string;
  "lead_/_email"?: string; // Handling typical import format
  business_name?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  status?: string;
  source?: string;
  lead_value?: string;
  leadValue?: string;
  industry?: string;
  designation?: string;
  website?: string;
  description?: string;
  tags?: string;
  timezone?: string;
  nal_reason?: string;
  client_response?: string;
  lead_type?: string;
  created?: string;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: { row: number; error: string }[];
}

/**
 * Parse CSV file content
 */
export function parseCsv(csvContent: string): CsvLeadRow[] {
  // Normalize line endings to handle different CSV formats
  // Replace \r\n (Windows) and \r (old Mac) with \n (Unix)
  let normalizedContent = csvContent
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Fix malformed CSV headers where the first column is on a separate line
  // This happens when Excel exports create split headers
  const lines = normalizedContent.split("\n");

  // Check if we have a split header (first line is just one column, second line starts with comma)
  if (lines.length > 1 && lines[1]?.startsWith(",")) {
    console.log("Detected split header - merging lines 1 and 2");
    // Merge the first two lines to create a proper header
    lines[0] = lines[0] + lines[1];
    lines.splice(1, 1); // Remove the second line
    normalizedContent = lines.join("\n");
    console.log("Fixed CSV header:", lines[0]?.substring(0, 200));
  }

  const result = Papa.parse<CsvLeadRow>(normalizedContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) =>
      header.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  console.log("Parse result fields:", result.meta.fields);

  // Filter out FieldMismatch errors (TooFewFields, TooManyFields) - these are common
  // when trailing empty columns are omitted. Only throw on actual fatal parse errors.
  const fatalErrors = result.errors.filter(
    (err) => err.type !== "FieldMismatch",
  );

  if (fatalErrors.length > 0) {
    const firstError = fatalErrors[0];
    console.error("Parse errors:", fatalErrors.slice(0, 3)); // Only log first 3 errors
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `CSV parsing error: ${firstError?.message}${firstError?.row !== undefined ? ` at row ${firstError.row}` : ""}`,
    );
  }

  // Log field mismatch warnings for debugging, but don't fail
  const fieldMismatchErrors = result.errors.filter(
    (err) => err.type === "FieldMismatch",
  );
  if (fieldMismatchErrors.length > 0) {
    console.warn(
      `CSV has ${fieldMismatchErrors.length} rows with mismatched field counts - proceeding anyway`,
    );
  }

  if (!result.data || result.data.length === 0) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "CSV file contains no data rows",
    );
  }

  return result.data;
}

/**
 * Validate lead row
 */
function validateLeadRow(
  row: CsvLeadRow,
  rowIndex: number,
): { valid: boolean; error?: string; data?: Record<string, unknown> } {
  // Handle specific "Lead / Email" mapping from user request
  const leadEmailField = row["lead_/_email"];

  let email = (row.email || leadEmailField)?.trim();
  let leadName = row.lead_name || row.leadName;
  let businessName = row.business_name;

  // Helper to check if value is empty or NA
  const isEmptyOrNA = (val: string | undefined | null): boolean => {
    if (!val) return true;
    const trimmed = val.trim().toLowerCase();
    return (
      trimmed === "" || trimmed === "na" || trimmed === "n/a" || trimmed === "-"
    );
  };

  // Extract website name for fallback - USE AS IS (no parsing)
  let websiteName: string | null = null;
  if (row.website) {
    websiteName = row.website.trim();
  }

  // Handle lead_name fallback
  if (isEmptyOrNA(leadName)) {
    if (websiteName && !isEmptyOrNA(websiteName)) {
      leadName = websiteName;
    } else {
      leadName = "Unknown Lead";
    }
  }

  // Handle business_name fallback - use website if empty or NA
  if (isEmptyOrNA(businessName) && websiteName && !isEmptyOrNA(websiteName)) {
    businessName = websiteName;
  }

  if (email && !isValidEmail(email)) {
    return { valid: false, error: `Row ${rowIndex}: Invalid email format` };
  }

  const status = row.status?.trim().toLowerCase() || "fresh_lead";
  // Validate status against current enum values
  const validStatuses = Object.values(LEAD_STATUSES);
  if (status && !validStatuses.includes(status as any)) {
    // Try to map common variations to valid statuses
    const statusMap: Record<string, string> = {
      new: "fresh_lead",
      contacted: "fresh_lead",
      qualified: "hot_lead",
      negotiation: "hot_lead",
      lost: "not_interested",
      on_hold: "future_lead",
      unqualified: "not_a_lead",
    };
    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      return {
        valid: false,
        error: `Row ${rowIndex}: Invalid status "${status}". Valid values: ${validStatuses.join(", ")}`,
      };
    }
    // Use mapped status
    return validateLeadRow({ ...row, status: mappedStatus }, rowIndex);
  }

  const source = row.source?.trim().toLowerCase() || null;

  const leadValue = row.lead_value || row.leadValue;
  let parsedValue: number | null = null;
  if (leadValue) {
    parsedValue = parseFloat(leadValue);
    if (isNaN(parsedValue)) {
      parsedValue = null; // or error
    }
  }

  return {
    valid: true,
    data: {
      lead_name: leadName?.trim(),
      business_name: isEmptyOrNA(businessName) ? null : businessName?.trim(),
      email: email?.toLowerCase() || null,
      phone: row.phone?.trim().substring(0, 20) || null,
      alternate_phone:
        (row.alternate_phone || row.alternatePhone)?.trim().substring(0, 20) ||
        null,
      address: row.address?.trim() || null,
      city: row.city?.trim() || null,
      state: row.state?.trim() || null,
      country: row.country?.trim() || null,
      pincode: row.pincode?.trim().substring(0, 20) || null,
      status,
      source: source || null,
      lead_value: parsedValue,
      industry: row.industry?.trim() || null,
      designation: row.designation?.trim() || null,
      website: row.website?.trim() || null,
      description: row.description?.trim() || null,
      tags: row.tags
        ? row.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .join(", ")
        : null,
      // Additional lead fields
      timezone: row.timezone?.trim() || null,
      nal_reason: row.nal_reason?.trim() || null,
      client_response: row.client_response?.trim() || null,
      lead_type: row.lead_type?.trim() || null,
    },
  };
}

export interface DuplicateCheckRow {
  rowIndex: number; // 1-based (excluding header)
  leadName: string;
  email: string | null;
  phone: string | null;
  isDuplicate: boolean;
  duplicateLeadId: string | null;
  duplicateLeadName: string | null;
  action: "import" | "skip" | "update"; // default "import"
}

export interface PreviewCheckResult {
  rows: DuplicateCheckRow[];
  totalRows: number;
  duplicateCount: number;
}

/**
 * Parse CSV and check each row for duplicates by email or phone.
 * Returns a preview list so the user can choose per-row action.
 */
export async function checkDuplicates(
  csvContent: string,
  departmentId?: string | null,
): Promise<PreviewCheckResult> {
  const rows = parseCsv(csvContent);

  const result: DuplicateCheckRow[] = [];
  let duplicateCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const validation = validateLeadRow(row, i + 2);

    const email = validation.data?.email as string | null ?? null;
    const phone = validation.data?.phone as string | null ?? null;
    const leadName = (validation.data?.lead_name as string) ?? row.lead_name ?? row.leadName ?? "Unknown";

    let isDuplicate = false;
    let duplicateLeadId: string | null = null;
    let duplicateLeadName: string | null = null;

    if (email || phone) {
      // Build OR condition for email/phone match
      const orParts: string[] = [];
      if (email) orParts.push(`email.eq.${email}`);
      if (phone) orParts.push(`phone.eq.${phone}`);

      let q = supabaseAdmin
        .from("leads")
        .select("id, lead_name")
        .eq("is_deleted", false);

      if (departmentId) {
        q = q.eq("department_id", departmentId);
      }

      q = q.or(orParts.join(",")).limit(1);

      const { data } = await q;
      if (data && data.length > 0) {
        isDuplicate = true;
        duplicateLeadId = data[0]!.id;
        duplicateLeadName = data[0]!.lead_name;
        duplicateCount++;
      }
    }

    result.push({
      rowIndex: i + 1,
      leadName,
      email,
      phone,
      isDuplicate,
      duplicateLeadId,
      duplicateLeadName,
      action: isDuplicate ? "skip" : "import",
    });
  }

  return {
    rows: result,
    totalRows: rows.length,
    duplicateCount,
  };
}

/**
 * Get leads that are potential duplicates of each other in the system.
 * Groups leads sharing the same email or phone.
 */
export async function getDuplicateLeads(
  authUser: AuthUser,
): Promise<{ groups: { email: string | null; phone: string | null; leads: { id: string; leadName: string; email: string | null; phone: string | null; status: string; createdAt: string }[] }[] }> {
  // Find leads where email or phone occurs more than once
  const { data: emailDupes } = await supabaseAdmin
    .from("leads")
    .select("email")
    .eq("is_deleted", false)
    .not("email", "is", null);

  const { data: phoneDupes } = await supabaseAdmin
    .from("leads")
    .select("phone")
    .eq("is_deleted", false)
    .not("phone", "is", null);

  // Count occurrences
  const emailCounts: Record<string, number> = {};
  (emailDupes || []).forEach((r: any) => {
    if (r.email) emailCounts[r.email] = (emailCounts[r.email] || 0) + 1;
  });

  const phoneCounts: Record<string, number> = {};
  (phoneDupes || []).forEach((r: any) => {
    if (r.phone) phoneCounts[r.phone] = (phoneCounts[r.phone] || 0) + 1;
  });

  const duplicateEmails = Object.entries(emailCounts)
    .filter(([, c]) => c > 1)
    .map(([e]) => e);
  const duplicatePhones = Object.entries(phoneCounts)
    .filter(([, c]) => c > 1)
    .map(([p]) => p);

  if (duplicateEmails.length === 0 && duplicatePhones.length === 0) {
    return { groups: [] };
  }

  // Fetch actual leads for duplicate email/phone groups
  const groups: { email: string | null; phone: string | null; leads: any[] }[] = [];
  const seenLeadIds = new Set<string>();

  for (const email of duplicateEmails) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id, lead_name, email, phone, status, created_at")
      .eq("is_deleted", false)
      .eq("email", email)
      .order("created_at", { ascending: true });

    if (data && data.length > 1) {
      const leads = data.map((l: any) => ({
        id: l.id,
        leadName: l.lead_name,
        email: l.email,
        phone: l.phone,
        status: l.status,
        createdAt: l.created_at,
      }));
      leads.forEach((l) => seenLeadIds.add(l.id));
      groups.push({ email, phone: null, leads });
    }
  }

  for (const phone of duplicatePhones) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id, lead_name, email, phone, status, created_at")
      .eq("is_deleted", false)
      .eq("phone", phone)
      .order("created_at", { ascending: true });

    if (data && data.length > 1) {
      const leads = data
        .filter((l: any) => !seenLeadIds.has(l.id))
        .map((l: any) => ({
          id: l.id,
          leadName: l.lead_name,
          email: l.email,
          phone: l.phone,
          status: l.status,
          createdAt: l.created_at,
        }));
      if (leads.length > 1) {
        leads.forEach((l) => seenLeadIds.add(l.id));
        groups.push({ email: null, phone, leads });
      }
    }
  }

  return { groups };
}

/**
 * Import leads from CSV
 */
export async function importLeads(
  csvContent: string,
  createdBy: string,
  assignTo?: string,
  departmentId?: string | null,
  defaultStatus?: string,
  rowActions?: Record<number, "import" | "skip" | "update">,
): Promise<ImportResult> {
  const rows = parseCsv(csvContent);

  console.log(`Parsed ${rows.length} rows from CSV`);

  if (rows.length === 0) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "CSV file is empty");
  }

  if (rows.length > BULK_LIMITS.MAX_RECORDS) {
    throw ApiError.bulkLimitExceeded(BULK_LIMITS.MAX_RECORDS);
  }

  const result: ImportResult = {
    total: rows.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  const validLeads: Record<string, unknown>[] = [];
  const updateLeads: { id: string; data: Record<string, unknown> }[] = [];

  // Validate all rows first
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1; // 1-based rowIndex used in rowActions
    const action = rowActions?.[rowNumber] ?? "import";

    // Skip rows marked as skip
    if (action === "skip") {
      result.total--;
      continue;
    }

    const validation = validateLeadRow(rows[i]!, i + 2); // +2 for header row and 1-indexing
    if (!validation.valid) {
      result.failed++;
      result.errors.push({ row: i + 2, error: validation.error! });
      console.log(`Row ${i + 2} validation failed:`, validation.error);
    } else {
      // Override status if a valid defaultStatus is provided
      const leadData = validation.data!;
      if (defaultStatus && (Object.values(LEAD_STATUSES) as string[]).includes(defaultStatus)) {
        leadData.status = defaultStatus;
      }

      if (action === "update" && rowActions) {
        // Find the existing lead by email or phone to update it
        const email = leadData.email as string | null;
        const phone = leadData.phone as string | null;
        if (email || phone) {
          const orParts: string[] = [];
          if (email) orParts.push(`email.eq.${email}`);
          if (phone) orParts.push(`phone.eq.${phone}`);
          const { data: existing } = await supabaseAdmin
            .from("leads")
            .select("id")
            .eq("is_deleted", false)
            .or(orParts.join(","))
            .limit(1);
          if (existing && existing.length > 0) {
            updateLeads.push({ id: existing[0]!.id, data: leadData });
            continue;
          }
        }
        // If no match found, fall through to insert
      }

      validLeads.push({
        ...leadData,
        created_by: createdBy,
        assigned_to: assignTo || null,
        department_id: departmentId || null,
        is_deleted: false,
      });
    }
  }

  // Process updates
  for (const { id, data } of updateLeads) {
    try {
      const { error } = await supabaseAdmin
        .from("leads")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        result.failed++;
        result.errors.push({ row: 0, error: `Update failed for lead ${id}: ${error.message}` });
      } else {
        result.successful++;
      }
    } catch (err: any) {
      result.failed++;
      result.errors.push({ row: 0, error: `Update crashed for lead ${id}: ${err.message}` });
    }
  }

  console.log(
    `Validation complete: ${validLeads.length} valid, ${result.failed} failed`,
  );

  // Insert valid leads in batches
  const chunks = chunkArray(validLeads, BULK_LIMITS.BATCH_SIZE);

  for (const [index, chunk] of chunks.entries()) {
    console.log(
      `Inserting batch ${index + 1}/${chunks.length} (${chunk.length} leads)`,
    );
    try {
      const { error, count } = await supabaseAdmin.from("leads").insert(chunk);

      if (error) {
        console.error(`Batch ${index + 1} insertion error:`, error);
        result.failed += chunk.length;
        result.errors.push({
          row: 0,
          error: `Batch ${index + 1} failed: ${error.message}`,
        });
      } else {
        console.log(
          `Batch ${index + 1} success: inserted ${count || chunk.length} leads`,
        );
        result.successful += count || chunk.length;
      }
    } catch (err: any) {
      console.error(`Batch ${index + 1} exception:`, err);
      result.failed += chunk.length;
      result.errors.push({
        row: 0,
        error: `Batch ${index + 1} crashed: ${err.message}`,
      });
    }
  }

  console.log(
    `Import complete: ${result.successful} successful, ${result.failed} failed`,
  );

  return result;
}

/**
 * Export leads to CSV
 */
export async function exportLeads(
  authUser: AuthUser,
  filters?: {
    status?: string[];
    source?: string[];
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
    removeAfterExport?: boolean;
  },
): Promise<{ csv: string; exportedCount: number; removedCount: number }> {
  let query = supabaseAdmin
    .from("leads")
    .select(
      `
      id,
      lead_name,
      business_name,
      email,
      phone,
      alternate_phone,
      address,
      city,
      state,
      country,
      pincode,
      status,
      source,
      lead_value,
      industry,
      designation,
      website,
      description,
      tags,
      timezone,
      nal_reason,
      client_response,
      lead_type,
      created_at,
      updated_at,
      assigned_user:users!assigned_to(full_name)
    `,
    )
    .eq("is_deleted", false);

  // Role-based filtering
  if (authUser.role === "employee") {
    query = query.eq("assigned_to", authUser.id);
  } else if (authUser.role === "manager") {
    // Managers see leads assigned to their team members
    if (authUser.teamId) {
      const { data: teamUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("team_id", authUser.teamId);

      const teamUserIds = (teamUsers || []).map((u: { id: string }) => u.id);
      if (!teamUserIds.includes(authUser.id)) {
        teamUserIds.push(authUser.id);
      }
      query = query.in("assigned_to", teamUserIds);
    } else {
      // Manager without team only sees their own assigned leads
      query = query.eq("assigned_to", authUser.id);
    }
  }
  // Admins see all leads (no filter)

  // Apply filters
  if (filters?.status?.length) {
    query = query.in("status", filters.status);
  }
  if (filters?.source?.length) {
    query = query.in("source", filters.source);
  }
  if (filters?.assignedTo) {
    query = query.eq("assigned_to", filters.assignedTo);
  }
  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (!data || data.length === 0) {
    return {
      csv: "lead_name,business_name,email,phone,alternate_phone,address,city,state,country,pincode,status,source,lead_value,industry,designation,website,description,tags,timezone,nal_reason,client_response,lead_type,assigned_to_name,created_at,updated_at\n",
      exportedCount: 0,
      removedCount: 0,
    };
  }

  // Collect lead IDs for potential removal
  const exportedIds = data.map((lead: any) => lead.id as string);

  const toSafeCsvText = (value: string | null | undefined): string => {
    const text = value ?? "";
    // Prevent spreadsheet apps from evaluating values as formulas.
    // Example: +43-1-555-6677 would otherwise become a math expression.
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
  };

  // Transform data for export (exclude id from CSV)
  const exportData = data.map((lead: any) => ({
    lead_name: lead.lead_name,
    business_name: lead.business_name || "",
    email: lead.email || "",
    phone: toSafeCsvText(lead.phone),
    alternate_phone: toSafeCsvText(lead.alternate_phone),
    address: lead.address || "",
    city: lead.city || "",
    state: lead.state || "",
    country: lead.country || "",
    pincode: lead.pincode || "",
    status: lead.status,
    source: lead.source || "",
    lead_value: lead.lead_value || "",
    industry: lead.industry || "",
    designation: lead.designation || "",
    website: lead.website || "",
    description: lead.description || "",
    tags: lead.tags || "",
    timezone: lead.timezone || "",
    nal_reason: lead.nal_reason || "",
    client_response: lead.client_response || "",
    lead_type: lead.lead_type || "",
    assigned_to_name: lead.assigned_user?.full_name || "",
    created_at: lead.created_at,
    updated_at: lead.updated_at || "",
  }));

  const csvContent = Papa.unparse(exportData);

  // Soft-delete exported leads if requested
  let removedCount = 0;
  if (filters?.removeAfterExport && exportedIds.length > 0) {
    const { count, error: deleteError } = await supabaseAdmin
      .from("leads")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .in("id", exportedIds);

    if (deleteError) {
      console.error("Failed to remove leads after export:", deleteError);
    } else {
      removedCount = count || exportedIds.length;
    }
  }

  return {
    csv: csvContent,
    exportedCount: exportedIds.length,
    removedCount,
  };
}

/**
 * Get CSV template for leads
 */
export function getLeadsCsvTemplate(): string {
  const headers = [
    "lead_name", // Required
    "business_name",
    "email", // Required (if provided, must be valid)
    "phone", // Required
    "alternate_phone",
    "address",
    "city",
    "state",
    "country", // Required
    "pincode",
    "status", // Optional: fresh_lead (default), hot_lead, meeting_scheduled, did_not_pick, follow_up, future_lead, not_interested, not_a_lead, won, proposal_sent
    "source", // website, referral, cold_call, email_campaign, social_media, etc.
    "lead_value",
    "industry",
    "designation",
    "website",
    "description",
    "tags", // Comma-separated: hot,priority,follow-up
    "timezone",
    "nal_reason",
    "client_response",
    "lead_type",
  ];

  const sampleRow = [
    "John Doe",
    "Acme Inc",
    "john@example.com",
    "1234567890",
    "",
    "123 Main St",
    "New York",
    "NY",
    "USA",
    "10001",
    "fresh_lead", // Or leave empty for default
    "website",
    "5000",
    "Technology",
    "Manager",
    "https://example.com",
    "Sample lead description",
    "hot,priority",
    "America/New_York",
    "",
    "",
    "B2B",
  ];

  return headers.join(",") + "\n" + sampleRow.join(",");
}
