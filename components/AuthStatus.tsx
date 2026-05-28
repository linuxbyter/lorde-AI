"use client";

import { useAuth } from "@/lib/useAuth";

export default function AuthStatus() {
  const { auth, loading, logout } = useAuth();

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
        href="/api/auth/deriv"
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border 
          hover:border-terminal-glow/50 transition-colors text-xs"
      >
        <span className="w-2 h-2 rounded-full bg-terminal-danger" />
        <span className="text-terminal-muted">Not Connected</span>
        <span className="text-terminal-glow font-medium">Connect</span>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-terminal-surface border border-terminal-border">
      <span className="w-2 h-2 rounded-full bg-terminal-glow animate-pulse-glow" />
      <div className="flex flex-col">
        <span className="text-xs font-mono text-terminal-glow">
          {auth.accountId}
        </span>
        <span className="text-[10px] text-terminal-muted">
          ${parseFloat(auth.balance).toFixed(2)}
        </span>
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
