"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PayrollRecord } from "@/types/payroll";
import { attendanceSummaryDisplay, formatINR, formatPayrollMonthLabel } from "@/lib/payroll-format";
import { Download, Printer } from "lucide-react";

export function PayslipView({
  record,
  companyName = "Ophanim Technologies",
  onDownloadPdf,
}: {
  record: PayrollRecord;
  companyName?: string;
  onDownloadPdf?: () => void | Promise<void>;
}) {
  const e = record.earnings || {};
  const d = record.deductions || {};
  const att = attendanceSummaryDisplay(record.attendance_summary as Record<string, number>);
  const month = record.month;
  const emp = record.employee;
  const payslipMonth = formatPayrollMonthLabel(month);

  const earningsRows = [
    { label: "Basic", value: Number((e as any).basic || 0) },
    { label: "HRA", value: Number((e as any).hra || 0) },
    { label: "Allowances", value: Number((e as any).allowances || 0) },
    { label: "Incentive", value: Number((e as any).incentive || 0) },
    { label: "Bonus", value: Number((e as any).bonus || 0) },
  ].filter((row) => row.value !== 0 || (row.label !== "Bonus" && row.label !== "Incentive"));

  const deductionRows = [
    { label: "PF", value: Number((d as any).pf || 0) },
    { label: "TDS", value: Number((d as any).tds || 0) },
    { label: "ESI", value: Number((d as any).esi || 0) },
    { label: "LOP", value: Number((d as any).lop || 0) },
    { label: "Advance Recovery", value: Number((d as any).advance_recovery || 0) },
    { label: "Manual", value: Number((d as any).manual || 0) },
  ].filter((row) => row.value !== 0);

  const printPayslip = () => {
    window.print();
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm payslip-root">
      <div className="flex items-center justify-between border-b px-4 py-3 print:hidden">
        <span className="text-sm text-muted-foreground">Payslip preview</span>
        <div className="flex items-center gap-2">
          {onDownloadPdf ? (
            <Button type="button" variant="default" size="sm" className="gap-2" onClick={onDownloadPdf}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={printPayslip}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5 print:p-6">
        <header className="flex flex-col gap-4 border-b pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-md border bg-white">
                <Image src="/logo.png" alt="Ophanim Technologies" fill className="object-contain p-1" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">{companyName}</h1>
                <p className="text-xs text-muted-foreground">Salary Payslip</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">Pay Period</p>
              <p className="text-muted-foreground">{payslipMonth}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Employee</p>
              <p className="mt-1 font-semibold">{emp?.full_name || "Employee"}</p>
              <p className="text-sm text-muted-foreground">{emp?.email || "-"}</p>
              <p className="text-sm text-muted-foreground capitalize">{emp?.job_title || "-"}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">Disbursed</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-medium">{record.employee_id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border p-4">
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
              Earnings
            </h2>
            <div className="space-y-2 text-sm">
              {earningsRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="tabular-nums font-medium">{formatINR(row.value)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-center justify-between font-semibold">
                <span>Gross Pay</span>
                <span className="tabular-nums">{formatINR(record.gross_pay)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4">
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
              Deductions
            </h2>
            <div className="space-y-2 text-sm">
              {deductionRows.length > 0 ? (
                deductionRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="tabular-nums text-red-700 dark:text-red-400">
                      {formatINR(row.value)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No deductions</p>
              )}
              <Separator className="my-2" />
              <div className="flex items-center justify-between font-semibold">
                <span>Total Deductions</span>
                <span className="tabular-nums text-red-700 dark:text-red-400">
                  {formatINR(record.total_deductions)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-muted/50 p-4 print:bg-transparent print:border">
          <div className="flex items-center justify-between text-base">
            <span className="font-semibold">Net pay</span>
            <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatINR(record.net_pay)}
            </span>
          </div>
        </section>

        <section className="text-sm border-t pt-4">
          <h2 className="text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
            Attendance summary
          </h2>
          <p>
            Working days: {att.workingDays} · Present: {att.presentDays} · Late: {att.lateDays} · Half days:{" "}
            {att.halfDays} · LOP days: {att.lopDays}
          </p>
        </section>

        <footer className="text-xs text-muted-foreground border-t pt-4 print:mt-8">
          This is a computer-generated payslip issued by Ophanim Technologies. For queries, contact HR.
        </footer>
      </div>
    </div>
  );
}
