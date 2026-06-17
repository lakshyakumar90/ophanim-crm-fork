"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Eye, Pencil, MoreHorizontal, Users, UserPlus } from "lucide-react";
import type { Lead } from "@/types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ALL_COLUMNS } from "@/components/sales/leads/leads-list-constants";
import { Sparkline } from "@/components/charts/sparkline";
import { EmptyState } from "@/components/shared/empty-state";

function getLeadSparklineData(lead: Lead): { value: number }[] {
  let hash = 0;
  for (let i = 0; i < lead.id.length; i++) {
    hash = lead.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const statusOffset = lead.status ? lead.status.length % 3 : 0;
  const base = (Math.abs(hash) % 3) + 1 + statusOffset;
  return [{ value: base }, { value: base + 1 }, { value: base }];
}

interface LeadsTableMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

interface LeadsTableViewProps {
  router: AppRouterInstance;
  isAdmin: boolean;
  userId?: string;
  visibleColumns: string[];
  tableLeads: Lead[];
  selectedIds: string[];
  isLoading: boolean;
  error: unknown;
  meta?: LeadsTableMeta;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (updater: (p: number) => number) => void;
  toggleSelectAll: () => void;
  toggleSelect: (id: string) => void;
  renderCell: (lead: Lead, key: string) => React.ReactNode;
  openReassignDialog: (lead: Lead) => void;
  leadsWithReminders: Set<string>;
  leadsWithOverdueReminders: Set<string>;
  onOpenDetail: (id: string) => void;
}

export function LeadsTableView({
  router,
  isAdmin,
  userId,
  visibleColumns,
  tableLeads,
  selectedIds,
  isLoading,
  error,
  meta,
  pageSize,
  onPageSizeChange,
  onPageChange,
  toggleSelectAll,
  toggleSelect,
  renderCell,
  openReassignDialog,
  leadsWithReminders,
  leadsWithOverdueReminders,
  onOpenDetail,
}: LeadsTableViewProps) {
  return (
    <>
      {meta && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(val) => {
                  onPageSizeChange(Number(val));
                  onPageChange(() => 1);
                }}
              >
                <SelectTrigger className="w-fit h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1} to{" "}
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
          </div>
          {meta.totalPages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasPrevPage}
                onClick={() => onPageChange((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasNextPage}
                onClick={() => onPageChange((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl ring-1 ring-border bg-card overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            Failed to load leads
          </div>
        ) : tableLeads.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="h-12 w-12 opacity-50" />}
            title="No leads found"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        tableLeads.length > 0 &&
                        selectedIds.length === tableLeads.length
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {ALL_COLUMNS.filter((col) =>
                  visibleColumns.includes(col.key),
                ).map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap">
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="w-24 whitespace-nowrap">Trend</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableLeads.map((lead: Lead) => (
                <TableRow
                  key={lead.id}
                  className={`cursor-pointer hover:bg-muted ${
                    selectedIds.includes(lead.id)
                      ? "bg-primary/5"
                      : leadsWithOverdueReminders.has(lead.id)
                        ? "bg-red-200/60 hover:bg-red-200 border-l-2 border-l-red-500"
                        : leadsWithReminders.has(lead.id)
                          ? "bg-green-200/60 hover:bg-green-200 border-l-2 border-l-green-500"
                          : ""
                  }`}
                  onClick={() => onOpenDetail(lead.id)}
                >
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                        aria-label={`Select ${lead.leadName}`}
                      />
                    </TableCell>
                  )}
                  {ALL_COLUMNS.filter((col) =>
                    visibleColumns.includes(col.key),
                  ).map((col) => (
                    <TableCell key={`${lead.id}-${col.key}`}>
                      {renderCell(lead, col.key)}
                    </TableCell>
                  ))}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Sparkline
                      data={getLeadSparklineData(lead)}
                      className="w-20"
                      height={32}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            onOpenDetail(lead.id)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {(isAdmin || lead.assignedTo === userId) && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/sales/leads/${lead.id}/edit`)
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => openReassignDialog(lead)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Reassign
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
