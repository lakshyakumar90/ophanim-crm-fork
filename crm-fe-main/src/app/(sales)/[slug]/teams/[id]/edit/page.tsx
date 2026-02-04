"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { teamsApi, usersApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const editTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  managerId: z.string().optional(),
});

type EditTeamFormData = z.infer<typeof editTeamSchema>;

export default function EditTeamPage() {
  const { id, slug } = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) {
      router.replace(`/${slug}/teams`);
      toast.error("Only admins can edit teams");
    }
  }, [isAdmin, router]);

  const { data: teamData, isLoading: loadingTeam } = useSWR(
    id ? `team-${id}` : null,
    () => teamsApi.get(id as string).then((res) => res.data.data),
  );

  const { data: usersData, isLoading: loadingUsers } = useSWR(
    "users-for-manager",
    () =>
      usersApi
        .list({ role: "manager", limit: 100 })
        .then((res) => res.data.data || []),
  );

  const team = teamData;
  const managers = usersData || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditTeamFormData>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      managerId: "",
    },
  });

  // Set form values when team data loads
  useEffect(() => {
    if (team) {
      setValue("name", team.name || "");
      setValue("description", team.description || "");
      setValue("managerId", team.managerId || "");
    }
  }, [team, setValue]);

  const selectedManagerId = watch("managerId");

  const onSubmit = async (data: EditTeamFormData) => {
    setIsSubmitting(true);
    try {
      await teamsApi.update(id as string, {
        name: data.name,
        description: data.description || null,
        managerId: data.managerId || null,
      });
      toast.success("Team updated successfully");
      router.push(`/${slug}/teams/${id}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to update team",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loadingTeam) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/${slug}/teams`)}
        >
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${slug}/teams/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Team</h1>
          <p className="text-muted-foreground">Update team information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
          <CardDescription>
            Modify the team name, description, and manager assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                placeholder="Enter team name"
                {...register("name")}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter team description"
                rows={3}
                {...register("description")}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerId">Team Manager</Label>
              <Select
                value={selectedManagerId || "none"}
                onValueChange={(value) =>
                  setValue("managerId", value === "none" ? "" : value)
                }
                disabled={isSubmitting || loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {managers.map((manager: any) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.fullName} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${slug}/teams/${id}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
