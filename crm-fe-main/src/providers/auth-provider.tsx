"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, tokens, tasksApi } from "@/lib/api";
import {
  syncSupabaseSession,
  clearSupabaseSession,
} from "@/lib/supabase-auth";
import type { User } from "@/types";
import { LoginNoticeDialog } from "@/components/auth/login-notice-dialog";

const REMINDER_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface LoginResult {
  requires2FA: boolean;
  userId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactorLogin: (
    email: string,
    password: string,
  ) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /**
   * Check if the current user has a specific permission.
   * Users with `crm:admin` permission always return true.
   * Falls back to legacy role check if no permissions loaded yet.
   */
  can: (perm: string) => boolean;
  /**
   * Check if the current user is in a specific department (by ID).
   * Global-scoped users always return true.
   */
  inDepartment: (deptId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public paths that don't require authentication
const publicPaths = ["/login", "/register", "/forgot-password"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const reminderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path));

  // Fire-and-forget reminder check — safe to call multiple times (idempotent)
  const triggerReminderCheck = useCallback(() => {
    tasksApi.checkReminders().catch(() => {
      // Silently ignore — non-critical background check
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.data);
      return response.data.data;
    } catch (error: any) {
      setUser(null);
      tokens.clear();
      return null;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const response = await authApi.login(email, password);
      const result = response.data.data;

      if (result.requires2FA) {
        return { requires2FA: true, userId: result.userId };
      }

      tokens.set(result.tokens.accessToken, result.tokens.refreshToken);
      setUser(result.user);

      try {
        await syncSupabaseSession(email, password);
      } catch (err) {
        console.warn("Supabase session sync failed (app will use backend fallback):", err);
      }

      // Check due reminders immediately after login
      triggerReminderCheck();

      return { requires2FA: false };
    },
    [],
  );

  const completeTwoFactorLogin = useCallback(
    async (email: string, password: string) => {
      try {
        await syncSupabaseSession(email, password);
      } catch (err) {
        console.warn("Supabase session sync after 2FA failed:", err);
      }
    },
    [],
  );

  const register = useCallback(async (data: any) => {
    const response = await authApi.register(data);
    const { user: userData, tokens: tokenData } = response.data.data;

    tokens.set(tokenData.accessToken, tokenData.refreshToken);
    setUser(userData);

    if (data.email && data.password) {
      try {
        await syncSupabaseSession(data.email, data.password);
      } catch (err) {
        console.warn("Supabase session sync after register failed:", err);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      tokens.clear();
      setUser(null);
      await clearSupabaseSession();
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    async function checkAuth() {
      const accessToken = tokens.accessToken;

      if (!accessToken) {
        setIsLoading(false);
        setUser(null);
        if (!isPublicPath) {
          router.replace("/login");
        }
        return;
      }

      try {
        const response = await authApi.me();
        const userData = response.data.data;
        setUser(userData);

        if (isPublicPath) {
          router.replace("/");
        }

        // Trigger reminder check on app init (session restore)
        triggerReminderCheck();
      } catch (error) {
        tokens.clear();
        setUser(null);
        if (!isPublicPath) {
          router.replace("/login");
        }
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [isPublicPath, router, triggerReminderCheck]);

  // Periodic reminder check every 5 minutes while authenticated
  useEffect(() => {
    if (!user) {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
      return;
    }
    reminderIntervalRef.current = setInterval(triggerReminderCheck, REMINDER_CHECK_INTERVAL_MS);
    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, [user, triggerReminderCheck]);

  /**
   * Permission check — heart of the RBAC system.
   * `crm:admin` is a superuser permission that passes all checks.
   * Falls back to legacy role-based check for backward compatibility
   * during the transition period before roles are fully seeded.
   */
  const can = useCallback(
    (perm: string): boolean => {
      if (!user) return false;

      const permissions = user.permissions ?? [];

      // crm:admin is a global superuser
      if (permissions.includes("crm:admin")) return true;

      // Check explicit permission
      if (permissions.includes(perm)) return true;

      // Legacy fallback: map old role enum to permission semantics
      // This keeps existing UI working before all roles are seeded
      if (permissions.length === 0) {
        const role = user.role;
        if (role === "admin") return true; // admin has all permissions
        if (
          role === "manager" &&
          (perm.startsWith("analytics:view") ||
            perm === "leads:view" ||
            perm === "leads:create" ||
            perm === "leads:import" ||
            perm === "leads:export" ||
            perm === "leads:edit" ||
            perm === "leads:assign" ||
            perm === "projects:view" ||
            perm === "projects:create" ||
            perm === "projects:edit" ||
            perm === "projects:assign_member" ||
            perm === "employees:view" ||
            perm === "finance:view" ||
            perm === "hr:view")
        ) {
          return true;
        }
        if (
          role === "employee" &&
          (perm === "analytics:view_own" ||
            perm === "leads:view" ||
            perm === "leads:create" ||
            perm === "leads:import" ||
            perm === "leads:export" ||
            perm === "projects:view" ||
            perm === "finance:view" ||
            perm === "hr:view")
        ) {
          return true;
        }
      }

      return false;
    },
    [user],
  );

  /**
   * Check if user can see a specific department.
   * Global role holders see all departments.
   */
  const inDepartment = useCallback(
    (deptId: string): boolean => {
      if (!user) return false;
      if (user.role === "admin") return true;
      if (user.isGlobal) return true;
      const deptIds = user.departmentIds ?? [];
      return deptIds.includes(deptId) || user.departmentId === deptId;
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        completeTwoFactorLogin,
        register,
        logout,
        refreshUser,
        can,
        inDepartment,
      }}
    >
      {isLoading && !isPublicPath ? (
        <div className="h-full min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <>
          {children}
          {user && !isPublicPath && <LoginNoticeDialog userId={user.id} />}
        </>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Legacy role check helpers (kept for backward compatibility)
export function useIsAdmin() {
  const { user, can } = useAuth();
  return user?.role === "admin" || can("crm:admin");
}

export function useIsManager() {
  const { user, can } = useAuth();
  return (
    user?.role === "admin" ||
    user?.role === "manager" ||
    can("crm:admin") ||
    can("analytics:view_team")
  );
}
