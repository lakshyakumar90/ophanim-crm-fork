"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { usersApi } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Camera, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Schema for regular users (they can edit full name + phone)
const userProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .optional(),
  phone: z.string().optional(),
});

// Schema for admins (includes fullName)
const adminProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

type UserProfileFormData = z.infer<typeof userProfileSchema>;
type AdminProfileFormData = z.infer<typeof adminProfileSchema>;
type ProfileFormData = UserProfileFormData | AdminProfileFormData;

export function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const isAdmin = useIsAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(
      isAdmin ? adminProfileSchema : userProfileSchema,
    ) as any,
  });

  useEffect(() => {
    if (user) {
      setValue("fullName", user.fullName);
      setValue("phone", user.phone || "");
    }
  }, [user, setValue, isAdmin]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      // Admins can update their own name, regular users just update phone
      if (isAdmin) {
        // Use the admin update endpoint for self
        await usersApi.update(user!.id, {
          fullName: (data as AdminProfileFormData).fullName,
          phone: data.phone || null,
        });
      } else {
        await usersApi.updateProfile({
          fullName: (data as UserProfileFormData).fullName,
          phone: data.phone || null,
        });
      }
      await refreshUser();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to update profile",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      await usersApi.uploadAvatar(file);
      await refreshUser();
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      const msg =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to upload avatar";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Update your personal details and profile photo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-8 flex flex-col items-center sm:flex-row sm:items-start gap-6">
          <div
            className="relative group cursor-pointer"
            onClick={handleAvatarClick}
          >
            <Avatar className="w-24 h-24 border-2 border-slate-100">
              <AvatarImage
                src={user?.avatarUrl || ""}
                alt={user?.fullName || "User"}
              />
              <AvatarFallback className="text-2xl">
                {user?.fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="font-medium text-lg">Profile Photo</h3>
            <p className="text-sm text-slate-500 max-w-[250px]">
              Click to upload a new photo. Supported formats: JPG, PNG. Max
              size: 5MB.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAvatarClick}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 border-t pt-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              {isAdmin ? (
                <>
                  <Input id="fullName" {...register("fullName")} />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">
                      {errors.fullName.message}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Input
                    id="fullName"
                    {...register("fullName")}
                    className="bg-muted"
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">
                      {errors.fullName.message}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input value={user?.email} disabled className="bg-muted" />
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={user?.role}
                disabled
                className="uppercase bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={user?.departmentName || "Not assigned"}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={
                  user?.jobTitle
                    ? user.jobTitle
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : "Not assigned"
                }
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <Input
                value={
                  user?.shiftType === "day_shift"
                    ? "Day Shift (9 AM - 6 PM)"
                    : user?.shiftType === "night_shift"
                      ? "Night Shift (7 PM - 4 AM)"
                      : "Not Set"
                }
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-slate-500">
                Contact admin to change your shift
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Assigned Roles</Label>
              <Input
                value={
                  user?.roleNames?.length
                    ? user.roleNames.join(", ")
                    : "No dynamic roles assigned"
                }
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Effective Permissions</Label>
              <Input
                value={
                  user?.permissions?.length
                    ? `${user.permissions.length} permissions granted`
                    : "No permissions loaded"
                }
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
