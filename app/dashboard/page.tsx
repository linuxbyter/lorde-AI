"use client";

import { useEffect } from "react";
import { BotStateProvider, useBotState } from "@/lib/botStore";
import { AuthProvider, useAuth } from "@/lib/authContext";
import AuthStatus from "@/components/AuthStatus";
import BotSelector from "@/components/BotSelector";
import RunBotButton from "@/components/RunBotButton";
import ConsoleLog from "@/components/ConsoleLog";

function DashboardInner() {
  const { auth } = useAuth();
  const { bot, isRunning, addLog } = useBotState();

  useEffect(() => {
    addLog("info", "Lorde Core Bot Terminal initialized");
    addLog("info", "Awaiting bot file and Deriv connection...");
  }, [addLog]);

  return (
    <div className="min-h-screen sm:h-screen flex flex-col bg-terminal-bg scan-overlay overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-terminal-border bg-terminal-surface/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-terminal-glow animate-pulse-glow" />
            <span className="font-bold text-xs sm:text-sm tracking-tight">
              <span className="text-terminal-text">LORDE</span>{" "}
              <span className="text-terminal-glow">CORE</span>
            </span>
          </div>
          <span className="w-px h-3 sm:h-4 bg-terminal-border hidden sm:block" />
          <span className="text-[9px] sm:text-[10px] text-terminal-muted tracking-widest uppercase hidden sm:block">
            Bot Terminal
          </span>
        </div>
        <AuthStatus />
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 gap-3 sm:gap-4">
        {/* Status bar */}
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {/* Connection */}
          <div className="px-3 py-2 rounded-lg border border-terminal-border bg-terminal-surface/50">
            <div className="text-[9px] sm:text-[10px] text-terminal-muted uppercase tracking-wider mb-1">
              Connection
            </div>
            <div className="flex items-center gap-2">
              {auth.authenticated && auth.selectedAccount ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-terminal-glow animate-pulse-glow" />
                  <span className="text-xs sm:text-sm font-mono text-terminal-glow truncate">
                    {auth.selectedAccount.accountId}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-terminal-danger" />
                  <span className="text-xs sm:text-sm text-terminal-muted">Disconnected</span>
                </>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="px-3 py-2 rounded-lg border border-terminal-border bg-terminal-surface/50">
            <div className="text-[9px] sm:text-[10px] text-terminal-muted uppercase tracking-wider mb-1">
              Balance
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs sm:text-sm font-mono ${auth.authenticated && auth.selectedAccount ? (auth.selectedAccount.type === "demo" ? "text-terminal-glow glow-text" : auth.selectedAccount.type === "real" ? "text-terminal-accent" : "text-terminal-muted") : "text-terminal-muted"}`}>
                {auth.authenticated && auth.selectedAccount ? parseFloat(auth.selectedAccount.balance).toFixed(2) : "0.00"}
              </span>
              {auth.authenticated && auth.selectedAccount && (
                <span className="text-[9px] sm:text-[10px] text-terminal-muted ml-1">{auth.selectedAccount.currency}</span>
              )}
            </div>
          </div>

          {/* Bot status */}
          <div className="px-3 py-2 rounded-lg border border-terminal-border bg-terminal-surface/50">
            <div className="text-[9px] sm:text-[10px] text-terminal-muted uppercase tracking-wider mb-1">
              Bot Status
            </div>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-terminal-glow animate-pulse" />
                  <span className="text-xs sm:text-sm font-mono text-terminal-glow">Running</span>
                </>
              ) : bot ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-terminal-accent" />
                  <span className="text-xs sm:text-sm text-terminal-muted font-mono truncate max-w-[120px]">
                    {bot.name}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-terminal-muted" />
                  <span className="text-xs sm:text-sm text-terminal-muted">No Bot</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 sm:px-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <BotSelector />
            <RunBotButton />
          </div>
          {bot && (
            <div className="text-[9px] sm:text-[10px] text-terminal-muted font-mono">
              Loaded: {bot.name} | {new Date(bot.loadedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Console log — fills remaining space */}
        <div className="flex-1 min-h-[200px] sm:min-h-0 rounded-lg border border-terminal-border bg-terminal-surface/30 overflow-hidden">
          <ConsoleLog />
        </div>
      </div>

      {/* Bottom accent line */}
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
