"use client";

import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { CreateEmailForm } from "@/components/finance/emails/CreateEmailForm";
import { Button } from "@/components/ui/button";

export default function NewEmailRequestPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/finance/emails">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            New Email Request
          </h1>
          <p className="text-muted-foreground">
            Create a finance email request
          </p>
        </div>
      </div>

      <CreateEmailForm />
    </div>
  );
}
