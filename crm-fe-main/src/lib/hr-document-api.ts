import { api } from "@/lib/api";
import type {
  DocumentStatsDto,
  EmployeeDocumentDto,
  HrDocumentTypeDto,
} from "@/types/hr-documents";

type Envelope<T> = { data: T };

function unwrap<T>(res: { data: Envelope<T> }): T {
  return res.data.data;
}

export async function fetchDocumentTypes(activeOnly?: boolean): Promise<HrDocumentTypeDto[]> {
  const res = await api.get<Envelope<HrDocumentTypeDto[]>>("/hr/document-types", {
    params: activeOnly ? { activeOnly: "true" } : undefined,
  });
  return unwrap(res);
}

export async function fetchActiveDocumentTypesForSelf(): Promise<HrDocumentTypeDto[]> {
  const res = await api.get<Envelope<HrDocumentTypeDto[]>>("/hr/document-types/active");
  return unwrap(res);
}

export async function createDocumentType(body: {
  slug: string;
  label: string;
  description?: string;
  sortOrder?: number;
}): Promise<HrDocumentTypeDto> {
  const res = await api.post<Envelope<HrDocumentTypeDto>>("/hr/document-types", body);
  return unwrap(res);
}

export async function updateDocumentType(
  id: string,
  body: Partial<{
    label: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<HrDocumentTypeDto> {
  const res = await api.patch<Envelope<HrDocumentTypeDto>>(
    `/hr/document-types/${id}`,
    body,
  );
  return unwrap(res);
}

export async function fetchDocuments(params?: {
  userId?: string;
  documentType?: string;
  isVerified?: boolean;
}): Promise<EmployeeDocumentDto[]> {
  const res = await api.get<Envelope<EmployeeDocumentDto[]>>("/hr/documents", {
    params: params?.isVerified === undefined
      ? { ...params }
      : { ...params, isVerified: String(params.isVerified) },
  });
  return unwrap(res);
}

export async function fetchDocumentStats(): Promise<DocumentStatsDto> {
  const res = await api.get<Envelope<DocumentStatsDto>>("/hr/documents/stats");
  return unwrap(res);
}

export async function fetchDocumentById(id: string): Promise<EmployeeDocumentDto> {
  const res = await api.get<Envelope<EmployeeDocumentDto>>(`/hr/documents/${id}`);
  return unwrap(res);
}

export async function fetchUserDocuments(userId: string): Promise<EmployeeDocumentDto[]> {
  const res = await api.get<Envelope<EmployeeDocumentDto[]>>(`/hr/documents/user/${userId}`);
  return unwrap(res);
}

export async function verifyDocument(
  id: string,
  notes?: string,
): Promise<EmployeeDocumentDto> {
  const res = await api.post<Envelope<EmployeeDocumentDto>>(
    `/hr/documents/${id}/verify`,
    { notes },
  );
  return unwrap(res);
}

export async function rejectDocument(
  id: string,
  reason: string,
): Promise<EmployeeDocumentDto> {
  const res = await api.post<Envelope<EmployeeDocumentDto>>(
    `/hr/documents/${id}/reject`,
    { reason },
  );
  return unwrap(res);
}

export async function updateDocument(
  id: string,
  body: {
    documentName?: string;
    documentType?: string;
    expiryDate?: string | null;
    notes?: string | null;
  },
): Promise<EmployeeDocumentDto> {
  const res = await api.put<Envelope<EmployeeDocumentDto>>(`/hr/documents/${id}`, body);
  return unwrap(res);
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/hr/documents/${id}`);
}
