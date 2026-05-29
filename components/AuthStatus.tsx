"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";

export default function AuthStatus() {
  const router = useRouter();
  const { auth, loading, logout } = useAuth();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const handleConnect = useCallback(() => {
    router.push("/api/auth/deriv");
  }, [router]);

  // When auth changes, update selectedAccountId to match currently selected
  useEffect(() => {
    if (auth.authenticated && auth.selectedAccount) {
      setSelectedAccountId(auth.selectedAccount.accountId);
    }
  }, [auth.authenticated, auth.selectedAccount]);

  const handleSelectAccount = async (accountId: string) => {
    try {
      await fetch("/api/auth/select-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      // Refresh auth to get updated selected account
      // This will trigger a re-fetch via useAuth's internal refresh? We'll manually refresh.
      // We can call a refetch function, but we don't have it. Instead, we can close modal and let useEffect above update.
      setShowAccountModal(false);
    } catch (err) {
      console.error("Failed to select account:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border">
        <span className="w-2 h-2 rounded-full bg-terminal-muted animate-pulse" />
        <span className="text-xs text-terminal-muted">Checking...</span>
      </div>
    );
  }

  if (!auth.authenticated) {
    return (
      <a
        href="#"
        onClick={handleConnect}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border hover:border-terminal-glow/50 transition-colors text-xs"
      >
        <span className="w-2 h-2 rounded-full bg-terminal-danger" />
        <span className="text-terminal-muted">Not Connected</span>
        <span className="text-terminal-glow font-medium">Connect</span>
      </a>
    );
  }

  // If authenticated but no accounts yet (should not happen), show placeholder
  if (!auth.selectedAccount) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border">
        <span className="w-2 h-2 rounded-full bg-terminal-glow animate-pulse-glow" />
        <div className="flex flex-col">
          <span className="text-xs font-mono text-terminal-glow">Loading accounts...</span>
        </div>
        <button
          onClick={logout}
          className="ml-2 text-[10px] text-terminal-muted hover:text-terminal-danger transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const selected = auth.selectedAccount;
  const typeLabel = selected.type === "demo" ? "DEMO" : selected.type === "real" ? "REAL" : selected.type.toUpperCase();

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border">
        <span className="w-2 h-2 rounded-full bg-terminal-glow animate-pulse-glow" />
        <div className="flex flex-col">
          <span className="text-xs font-mono text-terminal-glow">
            {selected.accountId}
          </span>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] text-terminal-${selected.type === "demo" ? "glow" : selected.type === "real" ? "accent" : "muted"}`}>
              ${selected.balance} {selected.currency}
            </span>
            <span className="text-[10px] text-terminal-muted px-2 py-0.5 rounded bg-terminal-surface/20">
              {typeLabel}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAccountModal(true)}
          className="ml-2 text-[10px] text-terminal-muted hover:text-terminal-danger transition-colors"
        >
          Change Account
        </button>
        <button
          onClick={logout}
          className="ml-2 text-[10px] text-terminal-muted hover:text-terminal-danger transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Account Selector Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 max-w-sm w-full mx-4 animate-slide-up shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-terminal-glow/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-terminal-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Select Trading Account</h3>
                <p className="text-xs text-terminal-muted">
                  Choose which Deriv account to use for trading operations
                </p>
              </div>
            </div>
            {auth.accounts.map((acc) => (
              <div
                key={acc.accountId}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg border border-terminal-border ${
                  acc.accountId === selectedAccountId
                    ? "bg-terminal-glow/20"
                    : "hover:bg-terminal-surface/80"
                } cursor-pointer`}
                onClick={() => {
                  setSelectedAccountId(acc.accountId);
                  handleSelectAccount(acc.accountId);
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full">
                    {acc.accountId === selectedAccountId && (
                      <span className="w-full h-full bg-terminal-glow" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-terminal-glow">{acc.accountId}</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] text-terminal-${acc.type === "demo" ? "glow" : acc.type === "real" ? "accent" : "muted"}`}>
                        ${acc.balance} {acc.currency}
                      </span>
                      <span className="text-[10px] text-terminal-muted px-2 py-0.5 rounded bg-terminal-surface/20">
                        {acc.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 rounded-md border border-terminal-border text-sm text-terminal-muted hover:bg-terminal-surface/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedAccountId) {
                    handleSelectAccount(selectedAccountId);
                  }
                  setShowAccountModal(false);
                }}
                className="ml-2 px-4 py-2 rounded-md bg-terminal-glow text-terminal-bg text-sm font-semibold text-center hover:bg-terminal-glow/90 transition-colors hover:shadow-glow"
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
