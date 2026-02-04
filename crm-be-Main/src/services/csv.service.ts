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
  company_name?: string;
  companyName?: string;
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
  profession?: string;
  course_name?: string;
  courseName?: string;
  webinar_date?: string;
  webinarDate?: string;
  time_in_session?: string;
  days_attended?: string;
  bootcamp_attendee?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
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
  const result = Papa.parse<CsvLeadRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) =>
      header.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  if (result.errors.length > 0) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `CSV parsing error: ${result.errors[0]?.message}`,
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

  // Attempt to extract name from email if name is missing but email exists
  if (!leadName && email) {
    if (isValidEmail(email)) {
      leadName = email.split("@")[0];
    } else {
      // If the field isn't an email, treat it as the name if we extracted it from "Lead / Email"
      if (!row.email && leadEmailField) {
        leadName = leadEmailField;
        email = undefined; // It wasn't an email
      }
    }
  }

  // Fallback if still no name
  if (!leadName || leadName.trim().length === 0) {
    if (email)
      leadName = email.split("@")[0]; // Last resort
    else leadName = "Unknown Lead";
  }

  if (email && !isValidEmail(email)) {
    // Soft fail: if email is invalid, just clear it but keep the lead if name exists
    // OR return error. Let's return error to be safe as per previous logic.
    return { valid: false, error: `Row ${rowIndex}: Invalid email format` };
  }

  const status = row.status?.trim().toLowerCase() || "new";
  // Allow any status if it matches enum, otherwise default or error?
  // Existing logic enforced enum matching. Keeping it strict is safer.
  const validStatuses = Object.values(LEAD_STATUSES);
  if (!validStatuses.includes(status as any)) {
    // If user passes "New Lead" instead of "new", maybe map it?
    // For now, strict check.
    // return { valid: false, error: `Row ${rowIndex}: Invalid status "${status}"` };
    // User request says "Status" field exists.
  }

  const source = row.source?.trim().toLowerCase();

  const leadValue = row.lead_value || row.leadValue;
  let parsedValue: number | null = null;
  if (leadValue) {
    parsedValue = parseFloat(leadValue);
    if (isNaN(parsedValue)) {
      parsedValue = null; // or error
    }
  }

  // Parsing booleans/dates
  const daysAttended = row.days_attended ? parseInt(row.days_attended) : null;
  const bootcampAttendee = row.bootcamp_attendee
    ? row.bootcamp_attendee.toLowerCase() === "yes" ||
      row.bootcamp_attendee.toLowerCase() === "true" ||
      row.bootcamp_attendee === "1"
    : false;

  return {
    valid: true,
    data: {
      lead_name: leadName?.trim(),
      company_name: (row.company_name || row.companyName)?.trim() || null,
      email: email?.toLowerCase() || null,
      phone: row.phone?.trim() || null,
      alternate_phone:
        (row.alternate_phone || row.alternatePhone)?.trim() || null,
      address: row.address?.trim() || null,
      city: row.city?.trim() || null,
      state: row.state?.trim() || null,
      country: row.country?.trim() || null,
      pincode: row.pincode?.trim() || null,
      status, // Mapping logic might be needed if CSV uses different status terms
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
        : null,
      // New columns
      profession: row.profession?.trim() || null,
      course_name: (row.course_name || row.courseName)?.trim() || null,
      webinar_date: row.webinar_date || row.webinarDate || null,
      time_in_session: row.time_in_session || null,
      days_attended: isNaN(daysAttended || NaN) ? null : daysAttended,
      bootcamp_attendee: bootcampAttendee,
      utm_source: row.utm_source || null,
      utm_campaign: row.utm_campaign || null,
      utm_medium: row.utm_medium || null,
      // Optional: created_at: row.created ? new Date(row.created).toISOString() : undefined // Be careful with this, usually system sets it.
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
): Promise<ImportResult> {
  const rows = parseCsv(csvContent);

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
    } else {
      validLeads.push({
        ...validation.data,
        created_by: createdBy,
        assigned_to: assignTo || null,
        department_id: departmentId || null,
        is_deleted: false,
      });
    }
  }

  // Insert valid leads in batches
  const chunks = chunkArray(validLeads, BULK_LIMITS.BATCH_SIZE);

  for (const chunk of chunks) {
    const { error, count } = await supabaseAdmin.from("leads").insert(chunk);

    if (error) {
      result.failed += chunk.length;
      result.errors.push({ row: 0, error: `Database error: ${error.message}` });
    } else {
      result.successful += count || chunk.length;
    }
  }

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
  },
): Promise<string> {
  let query = supabaseAdmin
    .from("leads")
    .select(
      `
      lead_name,
      company_name,
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
  } else if (authUser.role === "manager" && authUser.teamId) {
    const { data: teamMembers } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("team_id", authUser.teamId);

    const memberIds = (teamMembers || []).map(
      (m: any) => (m as { id: string }).id,
    );
    memberIds.push(authUser.id);
    query = query.in("assigned_to", memberIds);
  }

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
    return "lead_name,company_name,email,phone,status,source,lead_value,city,state,country,created_at\n";
  }

  // Transform data for export
  const exportData = data.map((lead: any) => ({
    lead_name: lead.lead_name,
    company_name: lead.company_name || "",
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
    tags: (lead.tags as string[])?.join(", ") || "",
    created_at: lead.created_at,
  }));

  return Papa.unparse(exportData);
}

/**
 * Get CSV template for leads
 */
export function getLeadsCsvTemplate(): string {
  const headers = [
    "lead_name",
    "company_name",
    "email",
    "phone",
    "alternate_phone",
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "status",
    "source",
    "lead_value",
    "industry",
    "designation",
    "website",
    "description",
    "tags",
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
    "new",
    "website",
    "5000",
    "Technology",
    "Manager",
    "https://example.com",
    "Sample lead",
    "hot,priority",
  ];

  return headers.join(",") + "\n" + sampleRow.join(",");
}
