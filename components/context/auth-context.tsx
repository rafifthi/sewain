"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  emailVerified: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = "sewain_access_token";
const REFRESH_TOKEN_KEY = "sewain_refresh_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    setAccessToken(null);
  }, []);

  const fetchMe = useCallback(async (token: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    fetchMe(stored).then((u) => {
      if (u) {
        setUser(u);
        setAccessToken(stored);
      } else {
        clearAuth();
      }
      setIsLoading(false);
    });
  }, [fetchMe, clearAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Login failed");
    }

    const data = await res.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Signup failed");
    }

    const data = await res.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(
    async (allDevices = false) => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken, allDevices }),
        }).catch(() => {});
      }
      clearAuth();
    },
    [clearAuth]
  );

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
