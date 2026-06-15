"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { UserSelector } from "@/components/shared/user-selector";
import type { Lead } from "@/types";
import type { LeadDetailState } from "@/hooks/sales/useLeadDetail";

interface LeadDetailDialogsProps {
  detail: LeadDetailState;
  lead: Lead;
}

export function LeadDetailDialogs({ detail, lead }: LeadDetailDialogsProps) {
  const {
    users,
    showNlaDialog,
    setShowNlaDialog,
    nlaReason,
    setNlaReason,
    isChangingStatus,
    handleNlaSubmit,
    handleNlaCancel,
    isReassignDialogOpen,
    setIsReassignDialogOpen,
    selectedUserId,
    setSelectedUserId,
    isAssigning,
    handleAssign,
  } = detail;

  return (
    <>
      <Dialog open={showNlaDialog} onOpenChange={setShowNlaDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark as Not A Lead</DialogTitle>
            <DialogDescription>
              Please provide a reason for marking this lead as "Not A Lead". This helps
              track why leads were disqualified.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nla-reason">Reason</Label>
              <Textarea
                id="nla-reason"
                placeholder="e.g., Wrong contact info, Not the decision maker, No budget, etc."
                value={nlaReason}
                onChange={(e) => setNlaReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleNlaCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleNlaSubmit}
              disabled={isChangingStatus || !nlaReason.trim()}
            >
              {isChangingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Lead</DialogTitle>
            <DialogDescription>
              Assign <strong>{lead.leadName}</strong> to another team member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UserSelector
              users={Array.isArray(users) ? users : []}
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              placeholder="Select team member..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedUserId || isAssigning}>
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Confirm Reassignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
