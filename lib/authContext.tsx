"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface Account {
  accountId: string;
  balance: string;
  currency: string;
  type: string;
}

export interface AuthInfo {
  authenticated: boolean;
  accounts: Account[];
  selectedAccount: Account | null;
}

interface AuthContextType {
  auth: AuthInfo;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthInfo>({
    authenticated: false,
    accounts: [],
    selectedAccount: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setAuth(data);
    } catch {
      setAuth({ authenticated: false, accounts: [], selectedAccount: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    window.location.href = "/api/auth/logout";
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
