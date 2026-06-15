import { tokens, twoFactorApi } from "@/lib/api";

export function getLoginErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { error?: { message?: string } } } })
    ?.response;
  return (
    response?.data?.error?.message ||
    "Login failed. Please check your credentials."
  );
}

export function getTwoFactorErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { error?: { message?: string } } } })
    ?.response;
  return response?.data?.error?.message || "Invalid 2FA code";
}

export async function verifyTwoFactorCode(userId: string, code: string) {
  const response = await twoFactorApi.login(userId, code);
  const result = response.data;
  tokens.set(result.tokens.accessToken, result.tokens.refreshToken);
  return result;
}
