"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/use-permission";
import { useSalaryBands } from "@/hooks/use-payroll";
import { deleteSalaryBand, fetchHrEmployees, getPayrollErrorMessage } from "@/lib/payroll-client";
import { formatINR } from "@/lib/payroll-format";
import type { HrEmployeeOption, SalaryBand } from "@/types/payroll";
import { SalaryBandModal } from "@/components/payroll/salary-band-modal";
import { SetCTCForEmployeeModal } from "@/components/payroll/set-ctc-for-employee-modal";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DeptOption {
  id: string;
  name: string;
}

function templateLabel(t: SalaryBand["components_template"]): string {
  if (t === null || t === undefined) return "—";
  if (Array.isArray(t)) return `${t.length} component(s)`;
  if (typeof t === "object" && "basic_pct" in t) {
    const o = t as { basic_pct?: number; hra_pct?: number; allowance_pct?: number };
    return `B ${o.basic_pct ?? 0}% / H ${o.hra_pct ?? 0}% / A ${o.allowance_pct ?? 0}%`;
  }
  return "Custom";
}

export default function SalaryBandsPage() {
  const router = useRouter();
  const canManage = usePermission("payroll:manage");
  const { bands, isLoading, mutate } = useSalaryBands();
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryBand | null>(null);
  const [deleteBand, setDeleteBand] = useState<SalaryBand | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [employees, setEmployees] = useState<HrEmployeeOption[]>([]);
  const [applyBand, setApplyBand] = useState<SalaryBand | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get("/departments");
        const d = res.data?.data;
        setDepartments(Array.isArray(d) ? d : []);
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const refreshEmployees = async () => {
    try {
      const list = (await fetchHrEmployees()) as Record<string, unknown>[];
      setEmployees(
        (Array.isArray(list) ? list : []).map((e) => ({
          id: String(e.id),
          fullName: String((e as any).fullName ?? (e as any).full_name ?? "Unknown"),
          full_name: (e as any).full_name as string | undefined,
          email: String((e as any).email ?? ""),
          departmentName: ((e as any).departmentName ?? (e as any).department_name) as string | null,
          teamName: ((e as any).teamName ?? (e as any).team_name) as string | null,
          current_ctc: ((e as any).current_ctc as number | null) ?? null,
          jobTitle: ((e as any).jobTitle ?? (e as any).job_title) as string | null,
        })),
      );
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (!canManage) return;
    void refreshEmployees();
  }, [canManage]);

  const confirmDelete = async () => {
    if (!deleteBand) return;
    setDeleting(true);
    try {
      await deleteSalaryBand(deleteBand.id);
      toast.success("Salary band removed");
      await mutate();
      setDeleteBand(null);
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/hr/payroll")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Salary bands</h1>
            <p className="text-muted-foreground mt-1">
              Reference ranges by designation. Does not change existing employee CTCs.
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add band
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Min CTC</TableHead>
              <TableHead className="text-right">Max CTC</TableHead>
              <TableHead>Components template</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canManage ? 6 : 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : bands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="h-40 text-center text-muted-foreground">
                  No salary bands configured.
                </TableCell>
              </TableRow>
            ) : (
              bands.map((band) => (
                <TableRow key={band.id}>
                  <TableCell className="font-medium">{band.designation}</TableCell>
                  <TableCell>{band.department || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(band.min_ctc)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(band.max_ctc)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {templateLabel(band.components_template)}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(band);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setApplyBand(band);
                          setApplyOpen(true);
                        }}
                        title="Set CTC for a specific employee"
                      >
                        <Wallet className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteBand(band)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SalaryBandModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        band={editing}
        departments={departments}
        onSaved={() => void mutate()}
      />

      <SetCTCForEmployeeModal
        open={applyOpen}
        onOpenChange={setApplyOpen}
        band={applyBand}
        employees={employees}
        onCreated={() => void refreshEmployees()}
      />

      <AlertDialog open={!!deleteBand} onOpenChange={(o) => !o && setDeleteBand(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete salary band?</AlertDialogTitle>
            <AlertDialogDescription>
              This salary band will be removed. It will not affect existing employee CTCs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
