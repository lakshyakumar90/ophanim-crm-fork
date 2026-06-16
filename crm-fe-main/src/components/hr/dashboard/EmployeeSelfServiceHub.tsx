"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, ClipboardList, Receipt, Target, Gift, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LINKS = [
  { label: "My Leave Requests", href: "/hr/leaves", icon: ClipboardList },
  { label: "My Payslips", href: "/hr/payroll/my-payslips", icon: Receipt },
  { label: "My Performance", href: "/hr/performance", icon: Target },
  { label: "My Benefits", href: "/hr/benefits", icon: Gift },
  { label: "My Shifts", href: "/hr/shifts", icon: Clock },
  { label: "Attendance", href: "/attendance", icon: CalendarClock },
];

export function EmployeeSelfServiceHub() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Self-Service</CardTitle>
        <CardDescription>
          Quick access to your HR records and requests
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {LINKS.map((link) => (
          <Button
            key={link.href}
            className="justify-between"
            variant="outline"
            onClick={() => router.push(link.href)}
          >
            <span className="flex items-center gap-2">
              <link.icon className="h-4 w-4 text-muted-foreground" />
              {link.label}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
