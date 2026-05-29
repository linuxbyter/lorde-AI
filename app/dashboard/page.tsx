"use client";

import { useEffect, useState } from "react";
import { BotStateProvider, useBotState } from "@/lib/botStore";
import { AuthProvider, useAuth } from "@/lib/authContext";
import AuthStatus from "@/components/AuthStatus";
import BotSelector from "@/components/BotSelector";
import LoadBotButton from "@/components/LoadBotButton";
import RunBotButton from "@/components/RunBotButton";
import ConsoleLog from "@/components/ConsoleLog";

// Mobile auth recovery helper
function recoverMobileAuth() {
  if (typeof window === "undefined") return;
  
  // Try to recover from localStorage if cookies failed
  const savedAuth = localStorage.getItem("lorde_auth_state");
  if (savedAuth) {
    try {
      const parsed = JSON.parse(savedAuth);
      if (parsed.token && parsed.accountId) {
        // Set cookies to recover auth state
        document.cookie = `deriv_token=${parsed.token}; path=/; max-age=3600; secure; samesite=lax`;
        document.cookie = `deriv_account=${parsed.accountId}; path=/; max-age=3600; secure; samesite=lax`;
        document.cookie = `deriv_balance=${parsed.balance || "0.00"}; path=/; max-age=3600; secure; samesite=lax`;
        document.cookie = `deriv_account_type=${parsed.accountType || "demo"}; path=/; max-age=3600; secure; samesite=lax`;
        document.cookie = `deriv_authenticated=true; path=/; max-age=3600; secure; samesite=lax`;
        
        // Clear the recovery flag
        localStorage.removeItem("lorde_auth_state");
      }
    } catch (e) {
      console.warn("Failed to recover mobile auth:", e);
    }
  }
}

// Save auth state to localStorage for mobile recovery
function saveAuthState() {
  if (typeof window === "undefined") return;
  
  // Read cookies to save state (for mobile recovery)
  const cookies = document.cookie.split("; ").reduce((acc, curr) => {
    const [name, value] = curr.split("=");
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  if (cookies.deriv_token && cookies.deriv_account) {
    localStorage.setItem("lorde_auth_state", JSON.stringify({
      token: cookies.deriv_token,
      accountId: cookies.deriv_account,
      balance: cookies.deriv_balance || "0.00",
      accountType: cookies.deriv_account_type || "demo"
    }));
  }
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-terminal-border bg-terminal-surface/50">
      <div className="text-[9px] sm:text-[10px] text-terminal-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg sm:text-xl font-bold font-mono ${color || "text-terminal-text"}`}>{value}</div>
      {sub && <div className="text-[9px] sm:text-[10px] text-terminal-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function DashboardInner() {
  const { auth } = useAuth();
  const { bot, isRunning, stats, addLog } = useBotState();
  const [showConsole, setShowConsole] = useState(false);

  useEffect(() => {
    // Try to recover mobile auth state from localStorage
    recoverMobileAuth();
    
    // Save current auth state to localStorage for recovery on next load
    saveAuthState();
    
    addLog("info", "Lorde Core Bot Terminal initialized");
  }, [addLog]);

  return (
    <div className="min-h-screen sm:h-screen flex flex-col bg-terminal-bg overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-terminal-border bg-terminal-surface/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-terminal-glow animate-pulse-glow" />
            <span className="font-bold text-xs sm:text-sm tracking-tight">
              <span className="text-terminal-text">LORDE</span>{" "}
              <span className="text-terminal-glow">CORE</span>
            </span>
          </div>
        </div>
        <AuthStatus />
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 gap-3 sm:gap-4 overflow-y-auto">
        {/* Stats row */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <StatCard
            label="Balance"
            value={`$${(parseFloat(auth.selectedAccount?.balance || "0") || 0).toFixed(2)}`}
            sub={auth.selectedAccount?.type === "demo" ? "Demo" : auth.selectedAccount?.type === "real" ? "Real" : ""}
            color={isRunning ? "text-terminal-glow glow-text" : "text-terminal-text"}
          />
          <StatCard
            label="P&L"
            value={`${stats.totalPnL >= 0 ? "+" : ""}$${stats.totalPnL.toFixed(2)}`}
            color={stats.totalPnL > 0 ? "text-terminal-glow" : stats.totalPnL < 0 ? "text-terminal-danger" : "text-terminal-muted"}
          />
          <StatCard
            label="Win Rate"
            value={`${stats.winRate}%`}
            sub={`${stats.winCount}W / ${stats.lossCount}L`}
            color={stats.winRate >= 50 ? "text-terminal-glow" : stats.closedCount > 0 ? "text-terminal-danger" : "text-terminal-muted"}
          />
          <StatCard
            label="Open"
            value={String(stats.openCount)}
            color={stats.openCount > 0 ? "text-terminal-accent" : "text-terminal-muted"}
          />
          <StatCard
            label="Status"
            value={isRunning ? "LIVE" : bot ? "READY" : "IDLE"}
            color={isRunning ? "text-terminal-glow glow-text" : bot ? "text-terminal-accent" : "text-terminal-muted"}
          />
        </div>

        {/* Controls row */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
             <BotSelector />
             <LoadBotButton />
             <RunBotButton />
           </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {bot && (
              <span className="text-[9px] sm:text-[10px] text-terminal-muted font-mono">
                {bot.name}
              </span>
            )}
            <button
              onClick={() => setShowConsole(!showConsole)}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md border text-[10px] sm:text-xs transition-colors ${
                showConsole
                  ? "border-terminal-glow/30 text-terminal-glow bg-terminal-glow/5"
                  : "border-terminal-border text-terminal-muted hover:border-terminal-glow/30"
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={showConsole ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
              </svg>
              {showConsole ? "Hide Logs" : "Show Logs"}
            </button>
          </div>
        </div>

        {/* Console — collapsible */}
        {showConsole && (
          <div className="flex-1 min-h-[200px] sm:min-h-0 rounded-lg border border-terminal-border bg-terminal-surface/30 overflow-hidden animate-slide-up">
            <ConsoleLog />
          </div>
        )}
      </div>

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-terminal-glow/40 to-transparent shrink-0" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <BotStateProvider>
        <DashboardInner />
      </BotStateProvider>
    </AuthProvider>
  );
}
