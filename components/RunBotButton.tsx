"use client";

import { useBotState } from "@/lib/botStore";
import { useAuth } from "@/lib/authContext";
import { useState, useRef, useCallback } from "react";

export default function RunBotButton() {
  const { bot, isRunning, startBot, stopBot, addLog, updateStats } = useBotState();
  const { auth } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(0);

  const handleRun = useCallback(async () => {
    if (!auth.authenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!bot) {
      addLog("warning", "No bot loaded. Please select a bot first.");
      return;
    }

    if (isRunning) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      stopBot();
      addLog("info", "Bot stopped by user");
      return;
    }

    const mySession = ++sessionRef.current;

    addLog("info", `Connecting to Deriv account ${auth.selectedAccount?.accountId ?? ""}...`);
    startBot();

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch("/api/bot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: auth.selectedAccount?.accountId,
          botCode: bot.code,
          botName: bot.name,
        }),
        signal: abortController.signal,
      });

      if (mySession !== sessionRef.current) return;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        addLog("error", errData.error || `Server error: ${res.status}`);
        if (mySession === sessionRef.current) stopBot();
        return;
      }

      if (!res.body) {
        addLog("error", "No response stream from server");
        if (mySession === sessionRef.current) stopBot();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (mySession !== sessionRef.current) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "ping") continue;

              const msgType = data.type === "error" ? "error" :
                              data.type === "warn" ? "warning" :
                              data.type === "success" ? "success" :
                              "info";

              const msg = data.message || "";
              if (msg.includes("WIN") || msg.includes("won")) {
                const pnlMatch = msg.match(/P&L: \$([-\d.]+)/);
                const pnl = pnlMatch ? parseFloat(pnlMatch[1]) : 0;
                updateStats((prev) => ({ totalPnL: prev.totalPnL + pnl, winCount: prev.winCount + 1, closedCount: prev.closedCount + 1 }));
                addLog("trade", msg);
              } else if (msg.includes("LOSS") || msg.includes("lost")) {
                const pnlMatch = msg.match(/P&L: \$([-\d.]+)/);
                const pnl = pnlMatch ? parseFloat(pnlMatch[1]) : 0;
                updateStats((prev) => ({ totalPnL: prev.totalPnL + pnl, lossCount: prev.lossCount + 1, closedCount: prev.closedCount + 1 }));
                addLog("trade", msg);
              } else if (msg.includes("SIGNAL:")) {
                addLog("signal", msg);
              } else if (msg.includes("Contract bought")) {
                updateStats((prev) => ({ openCount: prev.openCount + 1 }));
                addLog("trade", msg);
              } else if (msg.includes("Contract closed")) {
                updateStats((prev) => ({ openCount: Math.max(0, prev.openCount - 1) }));
                addLog("trade", msg);
              } else if (msg.includes("Session P&L")) {
                addLog("trade", msg);
              } else {
                addLog(msgType as "info" | "success" | "warning" | "error" | "trade", msg);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && mySession === sessionRef.current) {
        addLog("error", `Connection error: ${err.message}`);
      }
    } finally {
      if (mySession === sessionRef.current) {
        stopBot();
      }
      if (abortRef.current === abortController) {
        abortRef.current = null;
      }
    }
  }, [auth, bot, isRunning, startBot, stopBot, addLog, updateStats]);

  return (
    <>
      <button
        onClick={handleRun}
        disabled={!bot && !isRunning}
        className={`
          flex-1 sm:flex-none relative px-4 sm:px-6 py-2.5 rounded-md font-semibold text-sm transition-all duration-200
          ${
            isRunning
              ? "bg-terminal-danger/20 border border-terminal-danger/50 text-terminal-danger hover:bg-terminal-danger/30 animate-pulse-glow"
              : bot
              ? "bg-terminal-glow text-terminal-bg hover:bg-terminal-glow/90 hover:shadow-glow active:scale-[0.98]"
              : "bg-terminal-surface border border-terminal-border text-terminal-muted cursor-not-allowed opacity-50"
          }
        `}
      >
        {isRunning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-danger animate-pulse" />
            Stop Bot
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run Bot
          </span>
        )}
      </button>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 sm:p-6 max-w-sm w-full mx-auto animate-slide-up shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-terminal-danger/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-terminal-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Authentication Required</h3>
                <p className="text-xs text-terminal-muted">Sign in via Deriv to continue</p>
              </div>
            </div>
            <p className="text-sm text-terminal-muted mb-6 leading-relaxed">
              Connect your Deriv account to authorize bot trading operations.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAuthModal(false)}
                className="flex-1 px-4 py-2.5 rounded-md border border-terminal-border text-sm text-terminal-muted 
                  hover:bg-terminal-surface/80 transition-colors"
              >
                Cancel
              </button>
              <a
                href="/api/auth/deriv"
                className="flex-1 px-4 py-2.5 rounded-md bg-terminal-glow text-terminal-bg text-sm font-semibold 
                  text-center hover:bg-terminal-glow/90 transition-colors hover:shadow-glow"
              >
                Connect Deriv
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
