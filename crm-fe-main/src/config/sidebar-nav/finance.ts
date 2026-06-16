"use client";

import { Wallet, FileText, CircleDollarSign, Receipt, ClipboardCheck, CalendarClock, Mail, BarChart3, PiggyBank } from "lucide-react";
import type { NavItem } from "./types";

export const financeItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/finance",
    icon: Wallet,
    anyPermission: ["finance:view", "invoices:view"],
  },
  {
    title: "Invoices",
    href: "/finance/invoices",
    icon: FileText,
    anyPermission: ["finance:view", "invoices:view"],
  },
  {
    title: "Payments",
    href: "/finance/payments",
    icon: CircleDollarSign,
    anyPermission: ["finance:manage", "payments:view", "payments:manage"],
  },
  {
    title: "Expenses",
    href: "/finance/expenses",
    icon: Receipt,
    anyPermission: ["finance:view", "expenses:view"],
  },
  {
    title: "Approvals",
    href: "/finance/approvals",
    icon: ClipboardCheck,
    anyPermission: ["invoices:approve", "expenses:approve", "finance:manage"],
  },
  {
    title: "Budgets",
    href: "/finance/budgets",
    icon: PiggyBank,
    anyPermission: ["budgets:view", "budgets:manage"],
  },
  {
    title: "Recurring",
    href: "/finance/recurring",
    icon: CalendarClock,
    anyPermission: ["invoices:manage", "finance:manage"],
  },
  {
    title: "Emails",
    href: "/finance/emails",
    icon: Mail,
    anyPermission: ["finance:view", "invoices:view"],
  },
  {
    title: "Analytics",
    href: "/finance/analytics",
    icon: BarChart3,
    anyPermission: ["finance:manage", "budgets:view", "analytics:view_team"],
  },
];
