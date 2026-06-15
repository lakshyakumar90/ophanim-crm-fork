"use client";

import { Fragment, useState } from "react";
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
import { ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { usePayslips } from "@/hooks/use-payroll";
import { formatINR, formatPayrollMonthLabel } from "@/lib/payroll-format";
import { PayslipView } from "@/components/hr/payroll/payslip-view";
import { useAnyPermission } from "@/hooks/use-permission";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { downloadPayslipPdf } from "@/lib/payroll-client";
import { toast } from "sonner";

export default function MyPayslipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canOps = useAnyPermission(["payroll:manage", "payroll:approve"]);
  const { payslips, isLoading } = usePayslips();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    // Backend endpoint is self-service for any authenticated user.
    // We only hide admin actions when the user lacks payroll:* permissions.
    if (!user) router.replace("/forbidden");
  }, [user, router]);

  const sorted = [...payslips].sort((a, b) => b.month.localeCompare(a.month));

  const handleDownloadPdf = async (recordId: string, month: string) => {
    try {
      const blob = await downloadPayslipPdf(recordId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download payslip PDF");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My payslips</h1>
          <p className="text-muted-foreground mt-1">Disbursed payroll records for your account.</p>
        </div>
        {canOps && (
          <Button variant="outline" onClick={() => router.push("/hr/payroll")}>
            Payroll admin
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground print:hidden">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No payslips available yet.</p>
          <p className="text-sm mt-2">Payslips appear after payroll is disbursed.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden print:border-0 print:shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 print:hidden" />
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right print:hidden">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => {
                const open = openId === row.id;
                return (
                  <Fragment key={row.id}>
                    <TableRow className="print:hidden">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setOpenId(open ? null : row.id)}
                        >
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{formatPayrollMonthLabel(row.month)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(row.gross_pay)}</TableCell>
                      <TableCell className="text-right tabular-nums text-red-600">
                        {formatINR(row.total_deductions)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatINR(row.net_pay)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-emerald-700 font-medium">Disbursed</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDownloadPdf(row.id, row.month)}
                          >
                            PDF
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setOpenId(open ? null : row.id)}>
                            {open ? "Collapse" : "View"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow key={`${row.id}-detail`} className="bg-muted/20 hover:bg-muted/20 print:table-row">
                        <TableCell colSpan={7} className="p-4 print:p-0 print:block">
                          <PayslipView
                            record={{
                              ...row,
                              employee: row.employee || {
                                id: user?.id || "",
                                full_name: user?.fullName || "Employee",
                                email: user?.email || null,
                                job_title: user?.jobTitle || null,
                              },
                            }}
                            companyName="Ophanim Technologies"
                            onDownloadPdf={() => handleDownloadPdf(row.id, row.month)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
