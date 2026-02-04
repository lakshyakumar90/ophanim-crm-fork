"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, tokens } from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public paths that don't require authentication
const publicPaths = ["/login", "/register", "/forgot-password"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path));

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.data);
      return response.data.data;
    } catch (error: any) {
      setUser(null);
      // Clear tokens on any auth error
      tokens.clear();
      return null;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { user: userData, tokens: tokenData } = response.data.data;

    tokens.set(tokenData.accessToken, tokenData.refreshToken);
    setUser(userData);
  }, []);

  const register = useCallback(async (data: any) => {
    const response = await authApi.register(data);
    const { user: userData, tokens: tokenData } = response.data.data;

    tokens.set(tokenData.accessToken, tokenData.refreshToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      tokens.clear();
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  // Simple auth check on every mount/refresh
  useEffect(() => {
    async function checkAuth() {
      const accessToken = tokens.accessToken;

      // No token - user is not logged in
      if (!accessToken) {
        setIsLoading(false);
        setUser(null);
        // Redirect to login if trying to access protected path
        if (!isPublicPath) {
          router.replace("/login");
        }
        return;
      }

      // Has token - verify with /me API call
      try {
        const response = await authApi.me();
        const userData = response.data.data;
        setUser(userData);

        // If on public path (login/register), redirect to dashboard
        if (isPublicPath) {
          router.replace("/");
        }
      } catch (error) {
        // Token invalid or user not found - clear and redirect
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
    // Only run on mount - use pathname in deps to re-check when navigating
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
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

// Role check helpers
export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === "admin";
}

export function useIsManager() {
  const { user } = useAuth();
  return user?.role === "admin" || user?.role === "manager";
}
