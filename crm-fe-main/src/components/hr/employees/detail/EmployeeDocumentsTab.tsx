"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { EmployeeDocumentDto } from "@/types/hr-documents";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_REQUIRED_DOCUMENT_SLUGS } from "@/components/hr/documents/document-utils";
import { usePermission } from "@/hooks/auth/usePermission";
import { openDocumentUrl } from "@/lib/documentService";

function unwrapDocs(raw: unknown): EmployeeDocumentDto[] {
  const d = raw as { data?: EmployeeDocumentDto[] };
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

export function EmployeeDocumentsTab({
  userId,
  userName,
  active,
}: {
  userId: string;
  userName: string;
  active: boolean;
}) {
  const canDocManage = usePermission("hr:documents_manage");
  const hrManage = usePermission("hr:manage");
  const canUpload = canDocManage || hrManage;

  const [docs, setDocs] = useState<EmployeeDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setDocs([]);
  }, [userId]);

  useEffect(() => {
    if (!active || loaded) return;
    setLoading(true);
    void api
      .get(`/hr/documents/user/${userId}`)
      .then((res) => {
        setDocs(unwrapDocs(res.data));
        setLoaded(true);
      })
      .catch(() => {
        setDocs([]);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [active, userId, loaded]);

  const required = DEFAULT_REQUIRED_DOCUMENT_SLUGS.filter(Boolean);
  const bySlug = new Map<string, EmployeeDocumentDto[]>();
  for (const d of docs) {
    if (!bySlug.has(d.documentType)) bySlug.set(d.documentType, []);
    bySlug.get(d.documentType)!.push(d);
  }

  if (loading && !loaded) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No documents uploaded for this employee.</p>
        {canUpload ? (
          <Link href={`/hr/documents`} className="text-sm text-primary underline">
            Open documents module to upload
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Required coverage</h3>
        <ul className="text-sm space-y-1">
          {required.map((slug) => {
            const list = bySlug.get(slug) || [];
            const verified = list.some((x) => x.isVerified);
            return (
              <li key={slug} className="flex items-center gap-2">
                {verified ? (
                  <Badge className="bg-emerald-600">✓</Badge>
                ) : list.length ? (
                  <Badge variant="secondary">Pending</Badge>
                ) : (
                  <Badge variant="destructive">Missing</Badge>
                )}
                <span>{slug.replace(/_/g, " ")}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Files</h3>
        <ul className="space-y-2 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 border rounded-md p-2">
              <button
                type="button"
                className="text-primary hover:underline text-left"
                onClick={() => openDocumentUrl(d.fileUrl)}
              >
                {d.fileName || d.documentName}
              </button>
              <Badge variant="outline">{d.documentType}</Badge>
              {d.isVerified ? (
                <Badge className="bg-emerald-600">Verified</Badge>
              ) : (
                <Badge variant="secondary">Unverified</Badge>
              )}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">Employee: {userName}</p>
    </div>
  );
}
