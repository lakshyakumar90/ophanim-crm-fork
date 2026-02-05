"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { authApi, tokens, twoFactorApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAUserId, setTwoFAUserId] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data.email, data.password);
      const result = response.data.data;

      // Check if 2FA is required
      if (result.requires2FA) {
        setRequires2FA(true);
        setTwoFAUserId(result.userId);
        toast.info("Please enter your 2FA code");
        return;
      }

      // Normal login - save tokens and redirect
      tokens.set(result.tokens.accessToken, result.tokens.refreshToken);

      // Update auth state before redirect
      await refreshUser();

      toast.success("Welcome back!");
      router.push(callbackUrl);
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message ||
        "Login failed. Please check your credentials.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFACode.length !== 6 || !twoFAUserId) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifying2FA(true);
    try {
      const response = await twoFactorApi.login(twoFAUserId, twoFACode);
      const result = response.data;

      // Save tokens
      tokens.set(result.tokens.accessToken, result.tokens.refreshToken);

      // Force update auth state before redirect
      // This is critical to prevent redirect back to login
      await refreshUser();

      toast.success("Welcome back!");
      router.push(callbackUrl);
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Invalid 2FA code";
      toast.error(message);
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setTwoFAUserId(null);
    setTwoFACode("");
  };

  // 2FA Verification Step
  if (requires2FA) {
    return (
      <Card className="shadow-2xl border-slate-700/50 bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-slate-400">
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={twoFACode} onChange={setTwoFACode}>
              <InputOTPGroup>
                <InputOTPSlot
                  index={0}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <InputOTPSlot
                  index={1}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <InputOTPSlot
                  index={2}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <InputOTPSlot
                  index={3}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <InputOTPSlot
                  index={4}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <InputOTPSlot
                  index={5}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={handleBack}
              disabled={isVerifying2FA}
            >
              Back
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium"
              onClick={handleVerify2FA}
              disabled={isVerifying2FA || twoFACode.length !== 6}
            >
              {isVerifying2FA ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normal Login Step
  return (
    <Card className="shadow-2xl border-slate-700/50 bg-slate-800/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
          <LogIn className="h-7 w-7 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          Welcome back
        </CardTitle>
        <CardDescription className="text-slate-400">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                {...register("email")}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
              <PasswordInput
                id="password"
                placeholder="••••••••"
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                {...register("password")}
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-slate-700/50 pt-4">
        <div className="text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default function LoginPage() {
  return (
    // Wrap the component that uses useSearchParams in Suspense
    <Suspense
      fallback={<div className="text-white text-center">Loading...</div>}
    >
      <LoginForm />
    </Suspense>
  );
}
