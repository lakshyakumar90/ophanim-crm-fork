"use client";

import { Eye, FileWarning, Loader2, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import type { EmployeeDocumentDto } from "@/types/hr-documents";
import { openDocumentUrl } from "@/lib/documentService";
import { formatDocDate, slugToLabel } from "./document-utils";

export function DocumentRow({
  doc,
  typeLabel,
  department,
  canManage,
  canDelete,
  busyId,
  onVerify,
  onReject,
  onEdit,
  onDelete,
}: {
  doc: EmployeeDocumentDto;
  typeLabel: string;
  department: string;
  canManage: boolean;
  canDelete: boolean;
  busyId: string | null;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (doc: EmployeeDocumentDto) => void;
  onDelete: (doc: EmployeeDocumentDto) => void;
}) {
  const fileHref = doc.fileUrl?.trim();
  const openFile = () => {
    if (!fileHref) return;
    openDocumentUrl(fileHref);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{doc.userName || "—"}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{department || "—"}</TableCell>
      <TableCell>
        <Badge variant="secondary">{typeLabel || slugToLabel(doc.documentType)}</Badge>
      </TableCell>
      <TableCell>
        {fileHref ? (
          <button
            type="button"
            className="text-left text-primary hover:underline truncate max-w-50 block"
            onClick={openFile}
          >
            {doc.fileName || doc.documentName}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-700 text-sm">
            <FileWarning className="h-3.5 w-3.5 shrink-0" />
            File unavailable
          </span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {formatDocDate(doc.createdAt)}
      </TableCell>
      <TableCell>
        {doc.isVerified ? (
          <div className="flex flex-col gap-0.5">
            <Badge className="bg-emerald-600 hover:bg-emerald-600 w-fit">Verified ✓</Badge>
            {doc.verifiedByName || doc.verifiedAt ? (
              <span className="text-[10px] text-muted-foreground">
                {doc.verifiedByName ? `${doc.verifiedByName}` : ""}
                {doc.verifiedAt ? ` · ${formatDocDate(doc.verifiedAt)}` : ""}
              </span>
            ) : null}
          </div>
        ) : (
          <Badge variant="outline" className="border-amber-300 text-amber-900 bg-amber-50">
            Pending verification
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        {canManage || canDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {fileHref ? (
                <DropdownMenuItem onClick={openFile}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
              ) : null}
              {canManage && !doc.isVerified ? (
                <DropdownMenuItem
                  disabled={busyId === doc.id}
                  onClick={() => onVerify(doc.id)}
                >
                  {busyId === doc.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </DropdownMenuItem>
              ) : null}
              {canManage && !doc.isVerified ? (
                <DropdownMenuItem
                  disabled={busyId === doc.id}
                  onClick={() => onReject(doc.id)}
                >
                  {busyId === doc.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Request re-upload
                </DropdownMenuItem>
              ) : null}
              {canManage ? (
                <DropdownMenuItem onClick={() => onEdit(doc)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(doc)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
