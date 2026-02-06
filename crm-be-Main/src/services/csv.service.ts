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
      // Map cold_lead to fresh_lead until DB migration is applied
      cold_lead: "fresh_lead",
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

/**
 * Import leads from CSV
 */
export async function importLeads(
  csvContent: string,
  createdBy: string,
  assignTo?: string,
  departmentId?: string | null,
  defaultStatus?: string,
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

  // Validate all rows first
  for (let i = 0; i < rows.length; i++) {
    const validation = validateLeadRow(rows[i]!, i + 2); // +2 for header row and 1-indexing
    if (!validation.valid) {
      result.failed++;
      result.errors.push({ row: i + 2, error: validation.error! });
      console.log(`Row ${i + 2} validation failed:`, validation.error);
    } else {
      // Override status if defaultStatus is provided
      const leadData = validation.data!;
      if (
        defaultStatus &&
        (defaultStatus === "fresh_lead" || defaultStatus === "cold_lead")
      ) {
        leadData.status = defaultStatus;
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
      created_at
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
      csv: "lead_name,business_name,email,phone,status,source,lead_value,city,state,country,created_at\n",
      exportedCount: 0,
      removedCount: 0,
    };
  }

  // Collect lead IDs for potential removal
  const exportedIds = data.map((lead: any) => lead.id as string);

  // Transform data for export (exclude id from CSV)
  const exportData = data.map((lead: any) => ({
    lead_name: lead.lead_name,
    business_name: lead.business_name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    alternate_phone: lead.alternate_phone || "",
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
    created_at: lead.created_at,
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
