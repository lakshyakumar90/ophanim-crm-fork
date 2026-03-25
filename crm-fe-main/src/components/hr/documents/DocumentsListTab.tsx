"use client";

import { Fragment, useMemo, useState, type ChangeEvent } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmployeeDocumentDto } from "@/types/hr-documents";
import type { HrDocumentTypeDto } from "@/types/hr-documents";
import type { HrEmployeeDirectoryRow } from "@/types/hr-leaves";
import { verifyDocument, rejectDocument } from "@/lib/hr-document-api";
import { toastHrError } from "@/lib/hr-error-toast";
import { toast } from "sonner";
import { DocumentRow } from "./DocumentRow";
import { getExpiryTone, slugToLabel } from "./document-utils";

function empName(e: HrEmployeeDirectoryRow) {
  return e.fullName ?? e.full_name ?? "";
}

function empDept(e: HrEmployeeDirectoryRow) {
  return e.departmentName ?? e.department_name ?? "";
}

export function DocumentsListTab({
  documents,
  employees,
  types,
  loading,
  canManage,
  canDelete,
  onRefresh,
  onUploadClick,
  onEdit,
  onDelete,
  onDocumentsPatched,
}: {
  documents: EmployeeDocumentDto[];
  employees: HrEmployeeDirectoryRow[];
  types: HrDocumentTypeDto[];
  loading: boolean;
  canManage: boolean;
  canDelete: boolean;
  onRefresh: () => Promise<void>;
  onUploadClick: () => void;
  onEdit: (d: EmployeeDocumentDto) => void;
  onDelete: (d: EmployeeDocumentDto) => void;
  onDocumentsPatched: (updater: (prev: EmployeeDocumentDto[]) => EmployeeDocumentDto[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [openEmployeeIds, setOpenEmployeeIds] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const typeLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of types) m.set(t.slug, t.label);
    return m;
  }, [types]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(employees.map(empDept).filter(Boolean) as string[]),
    ).sort();
  }, [employees]);

  const documentsByUser = useMemo(() => {
    const m = new Map<string, EmployeeDocumentDto[]>();
    for (const doc of documents) {
      const rows = m.get(doc.userId) || [];
      rows.push(doc);
      m.set(doc.userId, rows);
    }
    return m;
  }, [documents]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const name = empName(e).toLowerCase();
      const email = (e.email || "").toLowerCase();
      const d = empDept(e);
      const matchSearch = !q || name.includes(q) || email.includes(q);
      const matchDept = deptFilter === "all" || d === deptFilter;
      return matchSearch && matchDept;
    });
  }, [employees, search, deptFilter]);

  const toggleEmployee = (id: string) => {
    setOpenEmployeeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      toast.success("Documents refreshed");
    } catch {
      /* toast in onRefresh */
    } finally {
      setRefreshing(false);
    }
  };

  const handleVerify = async (id: string) => {
    const prev = documents.find((d) => d.id === id);
    if (!prev) return;
    onDocumentsPatched((rows) =>
      rows.map((d) =>
        d.id === id
          ? {
              ...d,
              isVerified: true,
              verifiedAt: new Date().toISOString(),
            }
          : d,
      ),
    );
    setBusyId(id);
    try {
      const updated = await verifyDocument(id);
      onDocumentsPatched((rows) => rows.map((d) => (d.id === id ? updated : d)));
      toast.success("Document verified");
    } catch (e) {
      onDocumentsPatched((rows) =>
        rows.map((d) => (d.id === id ? prev : d)),
      );
      toastHrError(e, "Failed to verify document");
    } finally {
      setBusyId(null);
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectTargetId(id);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleRejectConfirm = async () => {
    const id = rejectTargetId;
    if (!id) return;
    const prev = documents.find((d) => d.id === id);
    if (!prev) return;

    if (!rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    setBusyId(id);
    try {
      const updated = await rejectDocument(id, rejectReason.trim());
      onDocumentsPatched((rows) => rows.map((d) => (d.id === id ? updated : d)));
      toast.success("Rejection sent to employee");
      setRejectOpen(false);
      setRejectTargetId(null);
      setRejectReason("");
    } catch (e) {
      onDocumentsPatched((rows) => rows.map((d) => (d.id === id ? prev : d)));
      toastHrError(e, "Failed to reject document");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-50 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee name or email…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshing || loading}
            onClick={() => void doRefresh()}
            className="gap-2"
          >
            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
          {canManage ? (
            <Button type="button" size="sm" className="gap-2" onClick={onUploadClick}>
              <Upload className="h-4 w-4" />
              Upload document
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Total documents</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Expired</TableHead>
              <TableHead>Expiring soon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && employees.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-12 text-center text-muted-foreground">
                  No employees found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => {
                const empDocs = documentsByUser.get(emp.id) || [];
                const verifiedCount = empDocs.filter((d) => d.isVerified).length;
                const pendingCount = empDocs.length - verifiedCount;
                const expiredCount = empDocs.filter((d) => getExpiryTone(d.expiryDate) === "past").length;
                const expiringSoonCount = empDocs.filter((d) => getExpiryTone(d.expiryDate) === "soon").length;
                const expanded = !!openEmployeeIds[emp.id];

                return (
                  <Fragment key={emp.id}>
                    <TableRow key={emp.id} className="cursor-pointer" onClick={() => toggleEmployee(emp.id)}>
                      <TableCell>
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{empName(emp) || "—"}</p>
                          <p className="text-xs text-muted-foreground">{emp.email || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{empDept(emp) || "—"}</TableCell>
                      <TableCell>{empDocs.length}</TableCell>
                      <TableCell>{verifiedCount}</TableCell>
                      <TableCell>{pendingCount}</TableCell>
                      <TableCell>{expiredCount}</TableCell>
                      <TableCell>{expiringSoonCount}</TableCell>
                    </TableRow>

                    {expanded ? (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/20 p-4">
                          {empDocs.length === 0 ? (
                            <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-4">
                              <p className="text-sm text-muted-foreground">No documents uploaded for this user.</p>
                              {canManage ? (
                                <Button type="button" size="sm" onClick={onUploadClick} className="gap-2">
                                  <Upload className="h-4 w-4" />
                                  Add document
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <div className="rounded-md border bg-background overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>File</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead>Expiry</TableHead>
                                    <TableHead>Verified</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {empDocs.map((doc) => (
                                    <DocumentRow
                                      key={doc.id}
                                      doc={doc}
                                      typeLabel={typeLabelMap.get(doc.documentType) || slugToLabel(doc.documentType)}
                                      department={empDept(emp)}
                                      canManage={canManage}
                                      canDelete={canDelete}
                                      busyId={busyId}
                                      onVerify={handleVerify}
                                      onReject={openRejectDialog}
                                      onEdit={onEdit}
                                      onDelete={onDelete}
                                    />
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={rejectOpen}
        onOpenChange={(v) => {
          setRejectOpen(v);
          if (!v) {
            setRejectTargetId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request document re-upload</DialogTitle>
            <DialogDescription>
              Share a clear reason so the employee can fix and re-upload this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              rows={4}
              placeholder="Enter rejection reason for employee notification"
              value={rejectReason}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setRejectReason(e.target.value)
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={busyId === rejectTargetId}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleRejectConfirm()}
              disabled={!rejectReason.trim() || busyId === rejectTargetId}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
