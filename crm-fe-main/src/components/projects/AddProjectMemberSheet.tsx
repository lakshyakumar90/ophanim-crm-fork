"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectsApi } from "@/lib/projects-api";
import { toast } from "sonner";

export function AddProjectMemberSheet({
  open,
  onOpenChange,
  projectId,
  onMemberAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onMemberAdded: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<any>(null);
  const [formData, setFormData] = useState({
    userId: "",
    role: "developer",
    allocation: "100",
  });

  useEffect(() => {
    if (open && !resources) {
      projectsApi.getResources().then((data) => {
        if (data) setResources(data);
      });
    }
  }, [open, resources]);

  useEffect(() => {
    if (!open) {
      setFormData({ userId: "", role: "developer", allocation: "100" });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      toast.error("Please select a user");
      return;
    }
    setLoading(true);
    try {
      await projectsApi.addMember(
        projectId,
        formData.userId,
        formData.role,
        parseInt(formData.allocation),
      );
      toast.success("Member added successfully");
      onOpenChange(false);
      onMemberAdded();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "";
      if (msg.toLowerCase().includes("already has this role")) {
        toast.error("This user already has that role on the project. Choose a different role.");
      } else {
        toast.error("Failed to add member");
      }
    } finally {
      setLoading(false);
    }
  };

  const allUsers = resources
    ? [
        ...resources.projectManagers,
        ...resources.developers,
        ...resources.designers,
        ...resources.seoSpecialists,
        ...resources.contentWriters,
      ]
    : [];
  const uniqueUsers = Array.from(
    new Map(allUsers.map((u: any) => [u.id, u])).values(),
  );

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add Team Member"
      description="Add a member to this project. A user can have multiple roles."
      size="lg"
      footer={
        <Button type="submit" form="add-member-form" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...
            </>
          ) : (
            "Add Member"
          )}
        </Button>
      }
    >
      <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>User</Label>
          <Select
            value={formData.userId}
            onValueChange={(val) => setFormData({ ...formData, userId: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {uniqueUsers.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  <div className="flex flex-col">
                    <span>{u.full_name || u.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.email}
                      {u.job_title ? ` · ${u.job_title.replace(/_/g, " ")}` : ""}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Project Role</Label>
          <Select
            value={formData.role}
            onValueChange={(val) => setFormData({ ...formData, role: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project_manager">Project Manager</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="designer">Designer</SelectItem>
              <SelectItem value="seo_specialist">SEO Specialist</SelectItem>
              <SelectItem value="content_writer">Content Writer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Allocation (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.allocation}
            onChange={(e) =>
              setFormData({ ...formData, allocation: e.target.value })
            }
          />
        </div>
      </form>
    </FormSideSheet>
  );
}
