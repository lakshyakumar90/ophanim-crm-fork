"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/auth/usePermission";
import { useDocumentsList } from "@/hooks/hr/useDocumentsList";
import { useDocumentTypes } from "@/hooks/hr/useDocumentTypes";
import { useDocumentStats } from "@/hooks/hr/useDocumentStats";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import type { HrEmployeeDirectoryRow } from "@/types/hr-leaves";
import type { EmployeeDocumentDto } from "@/types/hr-documents";
import { DocumentKPICards } from "@/components/hr/documents/DocumentKPICards";
import { DocumentsListTab } from "@/components/hr/documents/DocumentsListTab";
import { UploadDocumentSheet } from "@/components/hr/documents/UploadDocumentSheet";
import { EditDocumentModal } from "@/components/hr/documents/EditDocumentModal";
import { DeleteDocumentDialog } from "@/components/hr/documents/DeleteDocumentDialog";
import { DocumentTypesTab } from "@/components/hr/documents/DocumentTypesTab";
import { ListPageLayout } from "@/components/shared/list-page-layout";

export default function HrDocumentsPage() {
  const docView = usePermission("hr:documents_view");
  const hrView = usePermission("hr:view");
  const hrManage = usePermission("hr:manage");
  const docManage = usePermission("hr:documents_manage");
  const docDelete = usePermission("hr:documents_delete");

  const canView = docView || hrView || hrManage;
  const canManage = docManage || hrManage;
  const canDelete = docDelete || hrManage;

  const { documents, setDocuments, loading, load } = useDocumentsList();
  const { types, loading: typesLoading, load: loadTypes, loadActive: loadActiveTypes, patchType, addType } =
    useDocumentTypes();
  const { stats, loading: statsLoading, load: loadStats } = useDocumentStats();

  const [employees, setEmployees] = useState<HrEmployeeDirectoryRow[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [tab, setTab] = useState<"documents" | "types">("documents");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<EmployeeDocumentDto | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<EmployeeDocumentDto | null>(null);

  const refreshDocuments = useCallback(async () => {
    await Promise.all([load(undefined, true), loadStats()]);
  }, [load, loadStats]);

  const refreshAfterUpload = useCallback(async () => {
    await Promise.all([load(undefined, true), loadStats()]);
  }, [load, loadStats]);

  const refreshAll = useCallback(async () => {
    setEmpLoading(true);
    try {
      const loads: Promise<unknown>[] = [load(undefined, true), loadStats()];
      loads.push(canManage ? loadTypes() : loadActiveTypes());
      await Promise.all(loads);
      try {
        const em = await fetchHrEmployees();
        setEmployees(em);
      } catch {
        setEmployees([]);
      }
    } finally {
      setEmpLoading(false);
    }
  }, [load, loadStats, loadTypes, loadActiveTypes, canManage]);

  useEffect(() => {
    if (!canView) return;
    void refreshAll();
  }, [canView, refreshAll]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && canView) {
        void load(undefined, false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [canView, load]);

  const patchDocuments = useCallback(
    (updater: (prev: EmployeeDocumentDto[]) => EmployeeDocumentDto[]) => {
      setDocuments((prev) => updater(prev));
    },
    [setDocuments],
  );

  if (!canView) {
    return (
      <div className="p-6 text-muted-foreground">You do not have permission to view HR documents.</div>
    );
  }

  const kpiLoading = statsLoading || (loading && documents.length === 0);

  return (
    <ListPageLayout
      title="HR documents"
      description="Uploads, verification, and document types."
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Documents" },
      ]}
    >
      <DocumentKPICards
        stats={stats}
        documents={documents}
        employees={employees}
        loading={kpiLoading}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="documents">Employee documents</TabsTrigger>
          {canManage ? <TabsTrigger value="types">Document types</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <DocumentsListTab
            documents={documents}
            employees={employees}
            types={types}
            loading={loading || empLoading}
            canManage={canManage}
            canDelete={canDelete}
            onRefresh={refreshDocuments}
            onUploadClick={() => setUploadOpen(true)}
            onEdit={(d) => setEditDoc(d)}
            onDelete={(d) => setDeleteDoc(d)}
            onDocumentsPatched={patchDocuments}
          />
        </TabsContent>

        {canManage ? (
          <TabsContent value="types" className="space-y-4">
            <DocumentTypesTab
              types={types}
              loading={typesLoading}
              patchType={patchType}
              addType={addType}
            />
          </TabsContent>
        ) : null}
      </Tabs>

      {canManage ? (
        <UploadDocumentSheet
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          employees={employees}
          types={types}
          onUploaded={refreshAfterUpload}
        />
      ) : null}

      {canManage ? (
        <EditDocumentModal
          doc={editDoc}
          open={!!editDoc}
          onOpenChange={(v) => !v && setEditDoc(null)}
          onSaved={(row) => {
            setDocuments((prev) => prev.map((d) => (d.id === row.id ? row : d)));
          }}
        />
      ) : null}

      {canDelete ? (
        <DeleteDocumentDialog
          doc={deleteDoc}
          open={!!deleteDoc}
          onOpenChange={(v) => !v && setDeleteDoc(null)}
          onDeleted={(id) => {
            setDocuments((prev) => prev.filter((d) => d.id !== id));
            void loadStats();
          }}
        />
      ) : null}
    </ListPageLayout>
  );
}
