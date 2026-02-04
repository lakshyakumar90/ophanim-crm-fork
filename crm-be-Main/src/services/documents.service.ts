import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { USER_ROLES } from "../config/constants.js";
import type { AuthUser } from "../types/api.types.js";

// ====================
// TYPES
// ====================

export const DOCUMENT_TYPES = [
  "aadhar",
  "pan",
  "passport",
  "driving_license",
  "offer_letter",
  "contract",
  "nda",
  "resignation",
  "bank_details",
  "salary_slip",
  "tax_form",
  "education",
  "certification",
  "experience_letter",
  "photo",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

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
  expiryDate: string | null;
  notes: string | null;
  uploadedBy: string | null;
  uploadedByName?: string;
  createdAt: string;
  updatedAt: string;
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

  return (data || []).map((doc: any) => ({
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
    expiryDate: doc.expiry_date,
    notes: doc.notes,
    uploadedBy: doc.uploaded_by,
    uploadedByName: doc.uploader?.full_name,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  }));
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
    expiryDate: doc.expiry_date,
    notes: doc.notes,
    uploadedBy: doc.uploaded_by,
    uploadedByName: doc.uploader?.full_name,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
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
    expiryDate?: string;
    notes?: string;
  },
  uploadedBy: string,
): Promise<EmployeeDocument> {
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
      expiry_date: input.expiryDate,
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
 * Update document
 */
export async function updateDocument(
  documentId: string,
  input: {
    documentName?: string;
    documentType?: DocumentType;
    expiryDate?: string | null;
    notes?: string | null;
  },
): Promise<EmployeeDocument> {
  const updateData: Record<string, unknown> = {};
  if (input.documentName !== undefined)
    updateData.document_name = input.documentName;
  if (input.documentType !== undefined)
    updateData.document_type = input.documentType;
  if (input.expiryDate !== undefined) updateData.expiry_date = input.expiryDate;
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

  return getDocumentById(documentId);
}

/**
 * Unverify document (HR Manager+ only)
 */
export async function unverifyDocument(
  documentId: string,
): Promise<EmployeeDocument> {
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
