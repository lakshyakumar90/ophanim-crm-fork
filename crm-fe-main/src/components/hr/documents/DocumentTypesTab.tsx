"use client";

import { useState } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { HrDocumentTypeDto } from "@/types/hr-documents";
import { DocumentTypeModal } from "./DocumentTypeModal";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";

type PatchBody = Partial<{
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}>;

type CreateBody = {
  slug: string;
  label: string;
  description?: string;
  sortOrder?: number;
};

export function DocumentTypesTab({
  types,
  loading,
  patchType,
  addType,
}: {
  types: HrDocumentTypeDto[];
  loading: boolean;
  patchType: (id: string, body: PatchBody) => Promise<HrDocumentTypeDto>;
  addType: (body: CreateBody) => Promise<HrDocumentTypeDto>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<HrDocumentTypeDto | null>(null);
  const [toggleRow, setToggleRow] = useState<HrDocumentTypeDto | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const sorted = [...types].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  const runToggle = async (row: HrDocumentTypeDto, next: boolean) => {
    setSavingId(row.id);
    const prev = row.isActive;
    try {
      await patchType(row.id, { isActive: next });
      toast.success(next ? "Type activated" : "Type deactivated");
    } catch (e) {
      toastHrError(e, "Failed to update type");
      try {
        await patchType(row.id, { isActive: prev });
      } catch {
        /* ignore */
      }
    } finally {
      setSavingId(null);
      setToggleRow(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add document type
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Required*</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && types.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                  No document types yet.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{row.slug}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      See matrix slugs
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {savingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Switch
                          checked={row.isActive}
                          onCheckedChange={(v) => {
                            if (!v) {
                              setToggleRow(row);
                            } else {
                              void runToggle(row, true);
                            }
                          }}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                    {row.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditRow(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        * “Required” for compliance is configured in code (`DEFAULT_REQUIRED_DOCUMENT_SLUGS`) until the API
        exposes an `is_required` field.
      </p>

      <DocumentTypeModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        initial={null}
        onCreate={async (body) => {
          try {
            await addType(body);
            toast.success("Document type added");
          } catch (e) {
            toastHrError(e, "Failed to add type");
            throw e;
          }
        }}
        onUpdate={async () => {}}
      />

      <DocumentTypeModal
        open={!!editRow}
        onOpenChange={(v) => !v && setEditRow(null)}
        mode="edit"
        initial={editRow}
        onCreate={async () => {}}
        onUpdate={async (id, body) => {
          try {
            await patchType(id, body);
            toast.success("Document type saved");
          } catch (e) {
            toastHrError(e, "Failed to save type");
            throw e;
          }
        }}
      />

      <AlertDialog open={!!toggleRow} onOpenChange={(v) => !v && setToggleRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate document type?</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivating hides this type from upload options. Existing documents of this type are
              unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => toggleRow && void runToggle(toggleRow, false)}
            >
              Deactivate
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
