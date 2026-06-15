import { api } from "../client";

// =====================================================
// AUTH API (always through backend)
// =====================================================

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    departmentId?: string | null;
    jobTitle?: string | null;
    shiftType?: string;
    currentCtc?: number;
    salaryComponents?: {
      basic_pct?: number;
      hra_pct?: number;
      allowance_pct?: number;
    };
    salaryBandId?: string | null;
    rbacRoleIds?: string[];
  }) => api.post("/auth/register", data),

  logout: () => api.post("/auth/logout"),

  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),

  me: () => api.get("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
};

// =====================================================
// SETTINGS API (always through backend)
// =====================================================

export const settingsApi = {
  changePassword: async (data: any) => {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  },

  requestPasswordChangeOTP: async () => {
    const response = await api.post("/auth/request-password-otp");
    return response.data;
  },

  verifyPasswordChangeOTP: async (data: any) => {
    const response = await api.post("/auth/verify-password-otp", data);
    return response.data;
  },

  // 2FA methods
  setup2FA: async () => {
    const response = await api.post("/auth/2fa/setup");
    return response.data;
  },

  verify2FA: async (token: string) => {
    const response = await api.post("/auth/2fa/verify", { token });
    return response.data;
  },

  disable2FA: async (password: string, token: string) => {
    const response = await api.post("/auth/2fa/disable", { password, token });
    return response.data;
  },
};

// =====================================================
// 2FA LOGIN API (no auth required)
// =====================================================

export const twoFactorApi = {
  login: async (userId: string, token: string) => {
    const response = await api.post("/auth/login/2fa", { userId, token });
    return response.data;
  },
};
