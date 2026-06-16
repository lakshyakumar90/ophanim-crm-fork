"use client";

import { CreateRecurringForm } from "@/components/finance/recurring/CreateRecurringForm";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

export function CreateRecurringSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New recurring schedule"
      description="Set up automated invoice generation."
      size="3xl"
      className="sm:w-[min(100%,56rem)]"
    >
      {open ? (
        <CreateRecurringForm
          onSuccess={() => {
            onOpenChange(false);
            onCreated?.();
          }}
        />
      ) : null}
    </FormSideSheet>
  );
}
