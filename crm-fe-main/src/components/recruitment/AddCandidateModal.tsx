"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createCandidateAction } from "@/hooks/useCandidates";
import { toast } from "sonner";

export function AddCandidateModal({
  open,
  onOpenChange,
  jobPostingId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobPostingId: string;
  onSuccess: () => void;
}) {
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<string>("direct");
  const [resume_url, setResumeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    setLoading(true);
    try {
      await createCandidateAction({
        job_posting_id: jobPostingId,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        source: source as "referral" | "job_board" | "direct" | "agency",
        resume_url: resume_url.trim() || undefined,
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setResumeUrl("");
      setSource("direct");
      onSuccess();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>Add candidate</SheetTitle>
          <SheetDescription>
            Creates a candidate in <strong>Applied</strong> for this posting.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-6">
          <div className="space-y-2">
            <Label>Full name *</Label>
            <Input value={full_name} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="job_board">Job board / LinkedIn</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resume URL</Label>
            <Input
              placeholder="https://…"
              value={resume_url}
              onChange={(e) => setResumeUrl(e.target.value)}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add candidate"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
