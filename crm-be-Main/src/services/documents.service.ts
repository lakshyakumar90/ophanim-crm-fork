import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { assertActiveDocumentTypeSlug } from "./document-types.service.js";
import { createNotification } from "./notifications.service.js";

const HR_DOCUMENTS_BUCKET = "hr-documents";
/** Signed URLs returned to clients (refresh list to get a new link). */
const HR_DOC_SIGNED_URL_TTL_SEC = 60 * 60 * 24; // 24h

function safeFileSegment(originalName: string): string {
  const base = originalName.split(/[/\\]/).pop() || "file";
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (cleaned || "file").slice(0, 180);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

async function resolveStoredFileUrl(stored: string): Promise<string> {
  if (!stored) return "";
  if (isHttpUrl(stored)) return stored;
  const { data, error } = await supabaseAdmin.storage
    .from(HR_DOCUMENTS_BUCKET)
    .createSignedUrl(stored, HR_DOC_SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    console.error(
      "[hr-documents] createSignedUrl failed",
      stored,
      error?.message,
    );
    return stored;
  }
  return data.signedUrl;
}

function mapRowToEmployeeDocument(doc: any): EmployeeDocument {
  return {
    id: doc.id,
    userId: doc.user_id,
    userName: doc.user?.full_name,
    documentType: doc.document_type,
    documentName: doc.document_name,
    fileName: doc.file_name,
    fileUrl: doc.file_url,
    fileSize: doc.file_size,
    mimeType: doc.mime_type,
    isVerified: doc.is_verified,
    verifiedBy: doc.verified_by,
    verifiedByName: doc.verifier?.full_name,
    verifiedAt: doc.verified_at,
    notes: doc.notes,
    uploadedBy: doc.uploaded_by,
    uploadedByName: doc.uploader?.full_name,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

async function withResolvedFileUrl(
  doc: EmployeeDocument,
): Promise<EmployeeDocument> {
  return {
    ...doc,
    fileUrl: await resolveStoredFileUrl(doc.fileUrl),
  };
}

// ====================
// TYPES
// ====================

/** Stored slug; allowed values come from hr_document_types (active for new uploads). */
export type DocumentType = string;

export interface EmployeeDocument {
  id: string;
  userId: string;
  userName?: string;
  documentType: DocumentType;
  documentName: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedByName?: string;
  verifiedAt: string | null;
  notes: string | null;
  uploadedBy: string | null;
  uploadedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export async function notifyHrOnDocumentSubmission(input: {
  documentId: string;
  submittedByUserId: string;
  documentName: string;
  documentType: string;
}) {
  const { data: submitter } = await supabaseAdmin
    .from("users")
    .select("full_name")
    .eq("id", input.submittedByUserId)
    .maybeSingle();

  const submitterName = submitter?.full_name || "An employee";

  const { data: hrUsers, error: hrErr } = await supabaseAdmin
    .from("users")
    .select(
      `
      id,
      role,
      department:departments!department_id(slug)
    `,
    )
    .eq("is_active", true)
    .neq("role", "admin");

  if (hrErr) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, hrErr.message);
  }

  const recipients = (hrUsers || [])
    .filter((u: any) => {
      const slug = Array.isArray(u.department)
        ? u.department[0]?.slug
        : u.department?.slug;
      return slug === "hr";
    })
    .map((u: any) => u.id)
    .filter((id: string) => id !== input.submittedByUserId);

  if (recipients.length === 0) return;

  const seen = new Set<string>();
  for (const userId of recipients) {
    if (seen.has(userId)) continue;
    seen.add(userId);
    await createNotification({
      userId,
      title: "Document submitted for approval",
      message: `${submitterName} submitted ${input.documentName} (${input.documentType}) for verification.`,
      type: "system",
      relatedEntityType: "employee_document",
      relatedEntityId: input.documentId,
      actionUrl: "/hr/documents",
      priority: "medium",
    });
  }
}

async function notifyDocumentOwner(input: {
  userId: string;
  documentId: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
}) {
  await createNotification({
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: "system",
    relatedEntityType: "employee_document",
    relatedEntityId: input.documentId,
    actionUrl: "/documents/my-documents",
    priority: input.priority,
  });
}

async function notifyReviewerAction(input: {
  reviewerUserId: string;
  documentId: string;
  title: string;
  message: string;
}) {
  await createNotification({
    userId: input.reviewerUserId,
    title: input.title,
    message: input.message,
    type: "system",
    relatedEntityType: "employee_document",
    relatedEntityId: input.documentId,
    actionUrl: "/hr/documents",
    priority: "low",
  });
}

// ====================
// DOCUMENT OPERATIONS
// ====================

/**
 * Get all documents with optional filters
 */
export async function getDocuments(filters?: {
  userId?: string;
  documentType?: DocumentType;
  isVerified?: boolean;
}): Promise<EmployeeDocument[]> {
  let query = supabaseAdmin.from("employee_documents").select(
    `
      *,
      user:user_id (full_name),
      verifier:verified_by (full_name),
      uploader:uploaded_by (full_name)
    `,
  );

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters?.documentType) {
    query = query.eq("document_type", filters.documentType);
  }

  if (filters?.isVerified !== undefined) {
    query = query.eq("is_verified", filters.isVerified);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const rows = (data || []).map((doc: any) => mapRowToEmployeeDocument(doc));
  return Promise.all(rows.map(withResolvedFileUrl));
}

/**
 * Get documents for a specific user
 */
export async function getUserDocuments(
  userId: string,
): Promise<EmployeeDocument[]> {
  return getDocuments({ userId });
}

/**
 * Get single document by ID
 */
export async function getDocumentById(
  documentId: string,
): Promise<EmployeeDocument> {
  const { data, error } = await supabaseAdmin
    .from("employee_documents")
    .select(
      `
      *,
      user:user_id (full_name),
      verifier:verified_by (full_name),
      uploader:uploaded_by (full_name)
    `,
    )
    .eq("id", documentId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Document");
  }

  const doc = data as any;
  return withResolvedFileUrl(mapRowToEmployeeDocument(doc));
}

/**
 * Create document record
 */
export async function createDocument(
  input: {
    userId: string;
    documentType: DocumentType;
    documentName: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    notes?: string;
  },
  uploadedBy: string,
): Promise<EmployeeDocument> {
  await assertActiveDocumentTypeSlug(input.documentType);

  const { data, error } = await supabaseAdmin
    .from("employee_documents")
    .insert({
      user_id: input.userId,
      document_type: input.documentType,
      document_name: input.documentName,
      file_name: input.fileName,
      file_url: input.fileUrl,
      file_size: input.fileSize,
      mime_type: input.mimeType,
      notes: input.notes,
      uploaded_by: uploadedBy,
      is_verified: false,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return getDocumentById(data.id);
}

/**
 * Upload file to storage and create employee_documents row.
 * `file_url` in DB holds the storage object path (not an https URL).
 */
export async function createDocumentWithUploadedFile(
  input: {
    userId: string;
    documentType: DocumentType;
    documentName: string;
    fileName: string;
    fileBuffer: Buffer;
    mimeType: string;
    fileSize: number;
    notes?: string;
  },
  uploadedBy: string,
): Promise<EmployeeDocument> {
  await assertActiveDocumentTypeSlug(input.documentType);

  const docId = randomUUID();
  const storagePath = `${input.userId}/${docId}_${safeFileSegment(input.fileName)}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(HR_DOCUMENTS_BUCKET)
    .upload(storagePath, input.fileBuffer, {
      contentType: input.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      `Storage upload failed: ${uploadError.message}`,
    );
  }

  const { data, error } = await supabaseAdmin
    .from("employee_documents")
    .insert({
      id: docId,
      user_id: input.userId,
      document_type: input.documentType,
      document_name: input.documentName,
      file_name: input.fileName,
      file_url: storagePath,
      file_size: input.fileSize,
      mime_type: input.mimeType,
      notes: input.notes,
      uploaded_by: uploadedBy,
      is_verified: false,
    })
    .select()
    .single();

  if (error) {
    try {
      await supabaseAdmin.storage.from(HR_DOCUMENTS_BUCKET).remove([storagePath]);
    } catch {
      /* best-effort cleanup */
    }
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return getDocumentById(data.id);
}

/**
 * Update document
 */
export async function updateDocument(
  documentId: string,
  input: {
    documentName?: string;
    documentType?: DocumentType;
    notes?: string | null;
  },
): Promise<EmployeeDocument> {
  if (input.documentType !== undefined) {
    await assertActiveDocumentTypeSlug(input.documentType);
  }

  const updateData: Record<string, unknown> = {};
  if (input.documentName !== undefined)
    updateData.document_name = input.documentName;
  if (input.documentType !== undefined)
    updateData.document_type = input.documentType;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { error } = await supabaseAdmin
    .from("employee_documents")
    .update(updateData)
    .eq("id", documentId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return getDocumentById(documentId);
}

/**
 * Delete document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const { data: row, error: fetchError } = await supabaseAdmin
    .from("employee_documents")
    .select("file_url")
    .eq("id", documentId)
    .maybeSingle();

  if (fetchError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, fetchError.message);
  }

  const stored = row?.file_url as string | undefined;
  if (stored && !isHttpUrl(stored)) {
    const { error: rmError } = await supabaseAdmin.storage
      .from(HR_DOCUMENTS_BUCKET)
      .remove([stored]);
    if (rmError) {
      console.error(
        "[hr-documents] storage remove failed",
        stored,
        rmError.message,
      );
    }
  }

  const { error } = await supabaseAdmin
    .from("employee_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Verify document (HR Manager+ only)
 */
export async function verifyDocument(
  documentId: string,
  verifiedBy: string,
  notes?: string,
): Promise<EmployeeDocument> {
  const current = await getDocumentById(documentId);
  if (current.isVerified) {
    throw ApiError.badRequest("Only unverified documents can be verified");
  }

  const { error } = await supabaseAdmin
    .from("employee_documents")
    .update({
      is_verified: true,
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      notes: notes,
    })
    .eq("id", documentId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  await notifyDocumentOwner({
    userId: current.userId,
    documentId,
    title: "Document approved",
    message: `${current.documentName} has been approved by HR.`,
    priority: "medium",
  });

  return getDocumentById(documentId);
}

/**
 * Reject / request re-upload for a document (HR Manager+ only)
 */
export async function rejectDocument(
  documentId: string,
  rejectedBy: string,
  reason: string,
): Promise<EmployeeDocument> {
  const current = await getDocumentById(documentId);

  const { error } = await supabaseAdmin
    .from("employee_documents")
    .update({
      is_verified: false,
      verified_by: null,
      verified_at: null,
      notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  await notifyDocumentOwner({
    userId: current.userId,
    documentId,
    title: "Document needs correction",
    message: `${current.documentName} was not approved by HR. Reason: ${reason}`,
    priority: "high",
  });

  await notifyReviewerAction({
    reviewerUserId: rejectedBy,
    documentId,
    title: "Document rejection sent",
    message: `You requested a re-upload for ${current.documentName}.`,
  });

  return getDocumentById(documentId);
}

/**
 * Unverify document (HR Manager+ only)
 */
export async function unverifyDocument(
  documentId: string,
): Promise<EmployeeDocument> {
  const current = await getDocumentById(documentId);
  if (!current.isVerified) {
    throw ApiError.badRequest("Only verified documents can be unverified");
  }

  const { error } = await supabaseAdmin
    .from("employee_documents")
    .update({
      is_verified: false,
      verified_by: null,
      verified_at: null,
    })
    .eq("id", documentId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return getDocumentById(documentId);
}

/**
 * Get document statistics
 */
export async function getDocumentStats(): Promise<{
  total: number;
  verified: number;
  unverified: number;
  byType: { documentType: string; count: number }[];
}> {
  const { data, error } = await supabaseAdmin
    .from("employee_documents")
    .select("document_type, is_verified");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const docs = data || [];
  const total = docs.length;
  const verified = docs.filter((d: any) => d.is_verified).length;
  const unverified = total - verified;

  const typeCounts: Record<string, number> = {};
  docs.forEach((d: any) => {
    typeCounts[d.document_type] = (typeCounts[d.document_type] || 0) + 1;
  });

  const byType = Object.entries(typeCounts).map(([documentType, count]) => ({
    documentType,
    count,
  }));

  return { total, verified, unverified, byType };
}
