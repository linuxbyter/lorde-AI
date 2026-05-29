"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface Account {
  accountId: string;
  balance: string;
  currency: string;
  type: string; // "demo" or "real"
}

export interface AuthInfo {
  authenticated: boolean;
  token: string;
  accounts: Account[];
  selectedAccount: Account | null;
  expiresAt: number;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthInfo>({
    authenticated: false,
    token: "",
    accounts: [],
    selectedAccount: null,
    expiresAt: 0,
  });
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setAuth(data);

      // If token was refreshed, update cookies server-side
      if (data.refreshed) {
        // The server already returned new token data,
        // but we need to persist the new cookies
        // This is a limitation - we'll just use the new token in memory
      }
    } catch {
      setAuth({ authenticated: false, token: "", accounts: [], selectedAccount: null, expiresAt: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!auth.token || !auth.selectedAccount?.accountId) return;
    try {
      const res = await fetch("/api/bot/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: auth.token, accountId: auth.selectedAccount.accountId }),
      });
      const data = await res.json();
      if (data.balance && data.balance !== auth.selectedAccount.balance) {
        // Update selectedAccount balance in auth state
        setAuth(prev => ({
          ...prev,
          selectedAccount: {
            ...prev.selectedAccount!,
            balance: data.balance
          }
        }));
      }
    } catch {
      // Silent fail for balance polling
    }
  }, [auth.token, auth.selectedAccount?.accountId, auth.selectedAccount?.balance]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Balance polling every 30 seconds
  useEffect(() => {
    if (auth.authenticated && auth.token) {
      intervalRef.current = setInterval(fetchBalance, 30000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [auth.authenticated, auth.token, fetchBalance]);

  const logout = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    window.location.href = "/api/auth/logout";
  }, []);

  return { auth, loading, refresh, logout, fetchBalance };
}
