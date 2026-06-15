/** Aligned with crm-be documents.service + document-types */

export interface HrDocumentTypeDto {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeDocumentDto {
  id: string;
  userId: string;
  userName?: string;
  documentType: string;
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

export interface DocumentStatsDto {
  total: number;
  verified: number;
  unverified: number;
  byType: { documentType: string; count: number }[];
}
