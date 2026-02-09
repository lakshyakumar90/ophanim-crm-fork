"use client";

import { useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { emailApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Loader2,
  Mail,
  CheckCircle,
  XCircle,
  Trash2,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const emailSettingsSchema = z.object({
  emailType: z.enum(["smtp", "gmail"]),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1).max(65535),
  smtpUser: z.string().email("Valid email required"),
  smtpPassword: z.string().min(1, "Password/App Password is required"),
  smtpSecure: z.boolean(),
});

type EmailSettingsData = z.infer<typeof emailSettingsSchema>;

export default function EmailSettingsForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading, mutate } = useSWR("email-settings", () =>
    emailApi.getSettings(),
  );

  const settings = data;
  const isConfigured = settings?.isConfigured;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmailSettingsData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailType: "gmail",
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      smtpSecure: false,
    },
  });

  const emailType = watch("emailType");

  // Update form when settings load
  useState(() => {
    if (settings?.isConfigured) {
      setValue("emailType", settings.emailType || "gmail");
      setValue("smtpHost", settings.smtpHost || "smtp.gmail.com");
      setValue("smtpPort", settings.smtpPort || 587);
      setValue("smtpUser", settings.smtpUser || "");
      setValue("smtpSecure", settings.smtpSecure || false);
    }
  });

  // Auto-fill SMTP settings based on type
  const handleEmailTypeChange = (type: "smtp" | "gmail") => {
    setValue("emailType", type);
    if (type === "gmail") {
      setValue("smtpHost", "smtp.gmail.com");
      setValue("smtpPort", 587);
      setValue("smtpSecure", false);
    }
  };

  const onSubmit = async (data: EmailSettingsData) => {
    setIsSubmitting(true);
    try {
      await emailApi.saveSettings(data);
      toast.success("Email settings saved successfully");
      mutate();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to save settings",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await emailApi.testSettings();
      const result = response.data.data;

      if (result.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(`Test failed: ${result.message}`);
      }
      mutate();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Connection test failed",
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await emailApi.deleteSettings();
      toast.success("Email settings removed");
      mutate();
    } catch (error: any) {
      toast.error("Failed to remove settings");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <CardTitle>Email Configuration</CardTitle>
            </div>
            {isConfigured && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            )}
          </div>
          <CardDescription>
            Configure your email settings to send emails from your own account.
            For Gmail, use an App Password (not your regular password).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Email Provider</Label>
              <Select
                value={emailType}
                onValueChange={(v) =>
                  handleEmailTypeChange(v as "smtp" | "gmail")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">
                    Gmail (with App Password)
                  </SelectItem>
                  <SelectItem value="smtp">Custom SMTP Server</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {emailType === "smtp" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp.example.com"
                    {...register("smtpHost")}
                  />
                  {errors.smtpHost && (
                    <p className="text-sm text-red-500">
                      {errors.smtpHost.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    {...register("smtpPort", { valueAsNumber: true })}
                  />
                  {errors.smtpPort && (
                    <p className="text-sm text-red-500">
                      {errors.smtpPort.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="smtpUser">Email Address</Label>
              <Input
                id="smtpUser"
                type="email"
                placeholder="you@gmail.com"
                {...register("smtpUser")}
              />
              {errors.smtpUser && (
                <p className="text-sm text-red-500">
                  {errors.smtpUser.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPassword">
                {emailType === "gmail" ? "App Password" : "Password"}
              </Label>
              <PasswordInput
                id="smtpPassword"
                placeholder={
                  emailType === "gmail"
                    ? "Your 16-character app password"
                    : "Password"
                }
                {...register("smtpPassword")}
              />
              {errors.smtpPassword && (
                <p className="text-sm text-red-500">
                  {errors.smtpPassword.message}
                </p>
              )}
              {emailType === "gmail" && (
                <p className="text-xs text-muted-foreground">
                  Generate an App Password at{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Account Settings
                  </a>
                </p>
              )}
            </div>

            {emailType === "smtp" && (
              <div className="flex items-center gap-2">
                <Switch
                  id="smtpSecure"
                  checked={watch("smtpSecure")}
                  onCheckedChange={(checked) => setValue("smtpSecure", checked)}
                />
                <Label htmlFor="smtpSecure">Use SSL/TLS (port 465)</Label>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>

              {isConfigured && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Remove Email Configuration"
        description="Are you sure you want to remove your email configuration? You will no longer be able to send emails."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
