"use client";

import { Wallet, FileText, CircleDollarSign, Receipt, ClipboardCheck, CalendarClock, Mail, BarChart3 } from "lucide-react";
import type { NavItem } from "./types";

export const financeItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/finance",
    icon: Wallet,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Invoices",
    href: "/finance/invoices",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Payments",
    href: "/finance/payments",
    icon: CircleDollarSign,
    roles: ["admin", "manager"],
  },
  {
    title: "Expenses",
    href: "/finance/expenses",
    icon: Receipt,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Approvals",
    href: "/finance/approvals",
    icon: ClipboardCheck,
    roles: ["admin", "manager"],
  },
  {
    title: "Recurring",
    href: "/finance/recurring",
    icon: CalendarClock,
    roles: ["admin", "manager"],
  },
  {
    title: "Emails",
    href: "/finance/emails",
    icon: Mail,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Analytics",
    href: "/finance/analytics",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
];
