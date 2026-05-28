"use client";

import { useEffect, useState, useCallback } from "react";

export interface AuthInfo {
  authenticated: boolean;
  token: string;
  accountId: string;
  balance: string;
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthInfo>({
    authenticated: false,
    token: "",
    accountId: "",
    balance: "0.00",
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const authenticated = readCookie("deriv_authenticated") === "true";
    setAuth({
      authenticated,
      token: readCookie("deriv_token"),
      accountId: readCookie("deriv_account"),
      balance: readCookie("deriv_balance") || "0.00",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    document.cookie =
      "deriv_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "deriv_account=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "deriv_balance=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "deriv_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    refresh();
  }, [refresh]);

  return { auth, loading, refresh, logout };
}
