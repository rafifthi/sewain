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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readUserResponse(res: Response): Promise<AuthUser> {
  const text = await res.text();
  let data: { error?: string; user?: AuthUser } = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server returned a non-JSON response (${res.status})`);
    }
  }

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }

  if (typeof data.user !== "object" || data.user === null) {
    throw new Error("Server returned an invalid auth response");
  }

  return data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const me = await fetch("/api/auth/me");
        if (me.ok) {
          const u = await me.json();
          if (!cancelled) setUser(u);
          return;
        }
        // Access token expired — try to rotate the refresh token.
        const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshed.ok) {
          const data = await refreshed.json();
          if (!cancelled && data.user) setUser(data.user);
        }
      } catch {
        // Network failure: leave user logged out; guard will redirect.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setUser(await readUserResponse(res));
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    setUser(await readUserResponse(res));
  }, []);

  const logout = useCallback(async (allDevices = false) => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allDevices }),
    }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
