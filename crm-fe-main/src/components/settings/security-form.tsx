"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
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
import { Loader2, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const changePasswordSchema = z
  .object({
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export function SecurityForm() {
  const { user, refreshUser } = useAuth();

  // Password change states
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA states
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{
    secret: string;
    qrCode: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    // Check if 2FA is enabled from user data
    if (user) {
      setIs2FAEnabled(user.is2faEnabled || false);
    }
  }, [user]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const otpValue = watch("otp");

  const onRequestOTP = async () => {
    setIsRequestingOTP(true);
    try {
      await settingsApi.requestPasswordChangeOTP();
      setOtpSent(true);
      toast.success("OTP sent to your email");
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to send OTP");
    } finally {
      setIsRequestingOTP(false);
    }
  };

  const onSubmitPassword = async (data: ChangePasswordData) => {
    setIsSubmitting(true);
    try {
      await settingsApi.verifyPasswordChangeOTP({
        otp: data.otp,
        newPassword: data.newPassword,
      });
      toast.success("Password changed successfully");
      setOtpSent(false);
      reset();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to change password",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2FA Functions
  const handleSetup2FA = async () => {
    setIsSettingUp2FA(true);
    try {
      const response = await settingsApi.setup2FA();
      setQrCodeData(response.data);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to setup 2FA",
      );
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    setIsVerifying(true);
    try {
      await settingsApi.verify2FA(verificationCode);
      toast.success("2FA enabled successfully!");
      setIs2FAEnabled(true);
      setQrCodeData(null);
      setVerificationCode("");
      await refreshUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Invalid code");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    setIsDisabling(true);
    try {
      await settingsApi.disable2FA(disablePassword, disableCode);
      toast.success("2FA disabled successfully");
      setIs2FAEnabled(false);
      setDisableCode("");
      setDisablePassword("");
      await refreshUser();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to disable 2FA",
      );
    } finally {
      setIsDisabling(false);
    }
  };

  const copySecret = () => {
    if (qrCodeData?.secret) {
      navigator.clipboard.writeText(qrCodeData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Manage your password and security settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Password Change Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Change Password</h3>
            {!otpSent && (
              <Button
                variant="outline"
                onClick={onRequestOTP}
                disabled={isRequestingOTP}
              >
                {isRequestingOTP && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Request OTP to Change Password
              </Button>
            )}
          </div>

          {otpSent && (
            <form
              onSubmit={handleSubmit(onSubmitPassword)}
              className="space-y-4 border p-4 rounded-md"
            >
              <div className="space-y-2">
                <Label>OTP Verification</Label>
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
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput id="newPassword" {...register("newPassword")} />
                {errors.newPassword && (
                  <p className="text-sm text-red-500">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setOtpSent(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Change Password
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 2FA Section */}
        <div className="pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {is2FAEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <h3 className="text-lg font-medium">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-muted-foreground">
                  {is2FAEnabled
                    ? "Your account is protected with 2FA"
                    : "Add an extra layer of security to your account"}
                </p>
              </div>
            </div>

            {!qrCodeData && (
              <>
                {is2FAEnabled ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Disable 2FA
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable 2FA?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the extra security from your account.
                          Enter your password and current 2FA code to confirm.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <PasswordInput
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="Enter your password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>2FA Code</Label>
                          <InputOTP
                            maxLength={6}
                            value={disableCode}
                            onChange={setDisableCode}
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
                        </div>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDisable2FA}
                          disabled={isDisabling}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDisabling && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Disable 2FA
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button onClick={handleSetup2FA} disabled={isSettingUp2FA}>
                    {isSettingUp2FA && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Enable 2FA
                  </Button>
                )}
              </>
            )}
          </div>

          {/* QR Code Setup */}
          {qrCodeData && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">
                  Scan this QR code with your authenticator app
                </p>
                <div className="inline-block p-4 bg-white rounded-lg">
                  <img
                    src={qrCodeData.qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Or enter this secret key manually:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
                    {qrCodeData.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copySecret}
                    className="h-8 w-8"
                  >
                    {secretCopied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-center block">
                  Enter the 6-digit code from your app to verify
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
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
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQrCodeData(null);
                    setVerificationCode("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleVerify2FA} disabled={isVerifying}>
                  {isVerifying && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Verify & Enable 2FA
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
