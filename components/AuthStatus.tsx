"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/authContext";

export default function AuthStatus() {
  const router = useRouter();
  const { auth, loading, logout, refresh } = useAuth();
  const [showAccountModal, setShowAccountModal] = useState(false);

  const handleConnect = useCallback(() => {
    router.push("/api/auth/deriv");
  }, [router]);

  const handleSelectAccount = async (accountId: string) => {
    try {
      await fetch("/api/auth/select-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      await refresh();
      setShowAccountModal(false);
    } catch (err) {
      console.error("Failed to select account:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border">
        <span className="w-2 h-2 rounded-full bg-terminal-muted animate-pulse" />
        <span className="text-[10px] sm:text-xs text-terminal-muted">Checking...</span>
      </div>
    );
  }

  if (!auth.authenticated) {
    return (
      <a
        href="#"
        onClick={handleConnect}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border hover:border-terminal-glow/50 transition-colors text-[10px] sm:text-xs"
      >
        <span className="w-2 h-2 rounded-full bg-terminal-danger" />
        <span className="text-terminal-muted hidden sm:inline">Not Connected</span>
        <span className="text-terminal-glow font-medium">Connect</span>
      </a>
    );
  }

  if (!auth.selectedAccount) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border">
        <span className="w-2 h-2 rounded-full bg-terminal-glow animate-pulse-glow" />
        <span className="text-[10px] sm:text-xs font-mono text-terminal-glow">Loading...</span>
      </div>
    );
  }

  const selected = auth.selectedAccount;
  const typeLabel = selected.type === "demo" ? "DEMO" : selected.type === "real" ? "REAL" : selected.type.toUpperCase();
  const typeColor = selected.type === "demo" ? "text-terminal-glow" : selected.type === "real" ? "text-terminal-accent" : "text-terminal-muted";

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border">
        <span className="w-2 h-2 rounded-full bg-terminal-glow animate-pulse-glow shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] sm:text-xs font-mono text-terminal-glow truncate">
            {selected.accountId}
          </span>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] sm:text-[10px] ${typeColor}`}>
              ${selected.balance} {selected.currency}
            </span>
            <span className="text-[8px] sm:text-[10px] text-terminal-muted px-1 sm:px-2 py-0.5 rounded bg-terminal-surface/20">
              {typeLabel}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAccountModal(true)}
          className="text-[9px] sm:text-[10px] text-terminal-muted hover:text-terminal-glow transition-colors shrink-0"
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
        <button
          onClick={logout}
          className="text-[9px] sm:text-[10px] text-terminal-muted hover:text-terminal-danger transition-colors shrink-0"
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Account Selector Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 sm:p-6 max-w-sm w-full animate-slide-up shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-terminal-glow/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-terminal-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm">Select Trading Account</h3>
                <p className="text-[10px] sm:text-xs text-terminal-muted">
                  Choose demo or real account
                </p>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {auth.accounts.map((acc) => (
                <div
                  key={acc.accountId}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border cursor-pointer transition-colors ${
                    acc.accountId === selected.accountId
                      ? "border-terminal-glow bg-terminal-glow/10"
                      : "border-terminal-border hover:bg-terminal-surface/80"
                  }`}
                  onClick={() => handleSelectAccount(acc.accountId)}
                >
                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                    acc.accountId === selected.accountId
                      ? "border-terminal-glow bg-terminal-glow"
                      : "border-terminal-muted"
                  }`} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-xs font-mono text-terminal-glow truncate">{acc.accountId}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] sm:text-[10px] ${acc.type === "demo" ? "text-terminal-glow" : acc.type === "real" ? "text-terminal-accent" : "text-terminal-muted"}`}>
                        ${parseFloat(acc.balance).toFixed(2)} {acc.currency}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-terminal-muted px-1.5 py-0.5 rounded bg-terminal-surface/20 uppercase">
                        {acc.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 rounded-md border border-terminal-border text-xs sm:text-sm text-terminal-muted hover:bg-terminal-surface/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
