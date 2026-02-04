"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { teamsApi, usersApi, departmentsApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function EditTeamPage() {
  const { id } = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    managerId: "",
    departmentId: "",
    description: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch team data
  const { data: teamData, isLoading: loadingTeam } = useSWR(
    id ? `team-${id}` : null,
    () => teamsApi.get(id as string).then((res) => res.data.data),
  );

  // Fetch departments
  const { data: departmentsData } = useSWR("departments", () =>
    departmentsApi.list().then((res) => res.data.data),
  );

  // Fetch managers (users with manager role) - filtered by selected department
  const { data: usersData } = useSWR(
    ["users-managers", formData.departmentId],
    () =>
      usersApi
        .list({
          role: "manager",
          departmentId: formData.departmentId || undefined,
        })
        .then((res) => res.data.data),
  );

  const departments = departmentsData || [];
  const managers = usersData || [];

  // Populate form when team data loads
  useEffect(() => {
    if (teamData) {
      setFormData({
        name: teamData.name || "",
        managerId: teamData.managerId || "",
        departmentId: teamData.departmentId || "",
        description: teamData.description || "",
      });
    }
  }, [teamData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Team name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Team name must be at least 2 characters";
    }

    if (!formData.managerId) {
      newErrors.managerId = "Manager is required";
    }

    if (!formData.departmentId) {
      newErrors.departmentId = "Department is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await teamsApi.update(id as string, {
        name: formData.name,
        managerId: formData.managerId,
        departmentId: formData.departmentId,
        description: formData.description || null,
      });
      toast.success("Team updated successfully");
      router.push(`/global/teams/${id}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to update team",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  if (loadingTeam) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team not found</p>
        <Link href="/global/teams">
          <Button variant="outline" className="mt-4">
            Back to Teams
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/global/teams/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Team</h1>
          <p className="text-muted-foreground">Update team details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Details
          </CardTitle>
          <CardDescription>Update the team information below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Team Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter team name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="departmentId">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && (
                <p className="text-sm text-red-500">{errors.departmentId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerId">
                Manager <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.managerId}
                onValueChange={(value) =>
                  setFormData({ ...formData, managerId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.managerId && (
                <p className="text-sm text-red-500">{errors.managerId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter team description (optional)"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link href={`/global/teams/${id}`}>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
