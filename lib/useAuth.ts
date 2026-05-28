"use client";

import { useEffect, useState, useCallback } from "react";

export interface AuthInfo {
  authenticated: boolean;
  token: string;
  accountId: string;
  balance: string;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthInfo>({
    authenticated: false,
    token: "",
    accountId: "",
    balance: "0.00",
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setAuth(data);
    } catch {
      setAuth({ authenticated: false, token: "", accountId: "", balance: "0.00" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    // Clear cookies server-side by fetching a logout endpoint or just refresh
    // For simplicity, we clear the cookie via the callback page trick
    document.cookie =
      "deriv_token=; path=/; max-age=0; SameSite=Lax; Secure";
    document.cookie =
      "deriv_account=; path=/; max-age=0; SameSite=Lax; Secure";
    document.cookie =
      "deriv_balance=; path=/; max-age=0; SameSite=Lax; Secure";
    document.cookie =
      "deriv_authenticated=; path=/; max-age=0; SameSite=Lax; Secure";
    setAuth({ authenticated: false, token: "", accountId: "", balance: "0.00" });
  }, []);

  return { auth, loading, refresh, logout };
}
