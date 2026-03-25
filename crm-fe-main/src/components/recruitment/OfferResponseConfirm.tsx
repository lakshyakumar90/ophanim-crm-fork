"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { recordOfferResponseAction } from "@/hooks/useOffers";

export function OfferResponseConfirm({
  open,
  onOpenChange,
  candidateId,
  response,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidateId: string | null;
  response: "accepted" | "declined" | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!candidateId || !response) return;
    setLoading(true);
    try {
      await recordOfferResponseAction(candidateId, response);
      onSuccess();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {response === "accepted" ? "Accept offer?" : "Decline offer?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {response === "accepted" ? (
              <>
                Accepting will create a user account for this candidate and
                initialize the onboarding checklist. This cannot be undone from
                the recruitment board.
              </>
            ) : (
              <>The candidate will be moved to <strong>Rejected</strong>.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button onClick={confirm} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : response === "accepted" ? (
              "Yes, accept offer"
            ) : (
              "Yes, decline"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
