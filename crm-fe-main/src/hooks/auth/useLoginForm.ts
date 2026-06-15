"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import {
  loginDefaultValues,
  loginSchema,
  type LoginFormData,
} from "@/lib/auth/login-schema";
import {
  getLoginErrorMessage,
  getTwoFactorErrorMessage,
  verifyTwoFactorCode,
} from "@/lib/auth/login-actions";

export function useLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin, refreshUser, completeTwoFactorLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAUserId, setTwoFAUserId] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      setPendingCredentials(null);
    };
  }, []);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await authLogin(data.email, data.password);

      if (result.requires2FA) {
        setRequires2FA(true);
        setTwoFAUserId(result.userId || null);
        setPendingCredentials({ email: data.email, password: data.password });
        toast.info("Please enter your 2FA code");
        return;
      }

      toast.success("Welcome back!");
      router.push(callbackUrl);
    } catch (error: unknown) {
      toast.error(getLoginErrorMessage(error));
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
      await verifyTwoFactorCode(twoFAUserId, twoFACode);

      if (pendingCredentials) {
        completeTwoFactorLogin(
          pendingCredentials.email,
          pendingCredentials.password,
        );
        setPendingCredentials(null);
      }

      await refreshUser();

      toast.success("Welcome back!");
      router.push(callbackUrl);
    } catch (error: unknown) {
      toast.error(getTwoFactorErrorMessage(error));
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setTwoFAUserId(null);
    setTwoFACode("");
    setPendingCredentials(null);
  };

  return {
    requires2FA,
    twoFACode,
    setTwoFACode,
    isVerifying2FA,
    isLoading,
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    handleVerify2FA,
    handleBack,
  };
}
