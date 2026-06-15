"use client";

import { usePayrollPage } from "@/hooks/hr/usePayrollPage";
import { PayrollPageShell } from "@/components/hr/payroll/PayrollPageShell";

export default function PayrollRunsPage() {
  const state = usePayrollPage();
  return <PayrollPageShell {...state} />;
}
