"use client";

import Link from "next/link";
import { CalendarClock, ArrowLeft } from "lucide-react";
import { CreateRecurringForm } from "@/components/finance/recurring/CreateRecurringForm";
import { Button } from "@/components/ui/button";

export default function NewRecurringSchedulePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/finance/recurring">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            New Recurring Schedule
          </h1>
          <p className="text-muted-foreground">
            Set up automated invoice generation
          </p>
        </div>
      </div>

      <CreateRecurringForm />
    </div>
  );
}
