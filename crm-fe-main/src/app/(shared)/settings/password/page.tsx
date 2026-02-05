"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const passwordSchema = z
  .object({
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const otpValue = watch("otp");

  const handleRequestOTP = async () => {
    setIsRequestingOTP(true);
    try {
      await settingsApi.requestPasswordChangeOTP();
      setStep("verify");
      toast.success("OTP sent to your registered email");
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to send OTP");
    } finally {
      setIsRequestingOTP(false);
    }
  };

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    try {
      await settingsApi.verifyPasswordChangeOTP({
        otp: data.otp,
        newPassword: data.newPassword,
      });
      toast.success("Password changed successfully!");
      reset();
      router.push("/settings");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to change password",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/settings")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Change Password
          </h1>
          <p className="text-muted-foreground">
            Secure your account with a new password
          </p>
        </div>
      </div>

      {step === "request" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Request OTP
            </CardTitle>
            <CardDescription>
              We'll send a 6-digit verification code to your registered email
              address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                For security reasons, we require OTP verification to change your
                password. Click the button below to receive a verification code
                on your email.
              </p>
            </div>
            <Button
              onClick={handleRequestOTP}
              disabled={isRequestingOTP}
              className="w-full"
            >
              {isRequestingOTP ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Verification Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Verify & Set New Password
            </CardTitle>
            <CardDescription>
              Enter the OTP sent to your email and set your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <InputOTP
                  maxLength={6}
                  value={otpValue || ""}
                  onChange={(value) => setValue("otp", value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                {errors.otp && (
                  <p className="text-sm text-red-500">{errors.otp.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput
                  id="newPassword"
                  placeholder="Enter new password"
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-500">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("request");
                    reset();
                  }}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={handleRequestOTP}
                disabled={isRequestingOTP}
              >
                {isRequestingOTP
                  ? "Sending..."
                  : "Didn't receive the code? Resend OTP"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
