"use client";

import { useBotState } from "@/lib/botStore";
import { useAuth } from "@/lib/useAuth";
import { useState } from "react";

export default function RunBotButton() {
  const { bot, isRunning, startBot, stopBot, addLog } = useBotState();
  const { auth } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleRun = async () => {
    if (!auth.authenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!bot) {
      addLog("warning", "No bot loaded. Please load a bot file first.");
      return;
    }

    if (isRunning) {
      // Stop
      stopBot();
      addLog("info", "Bot stopped by user");
      return;
    }

    // Start
    addLog("info", `Connecting to Deriv account ${auth.selectedAccount?.accountId ?? ""}...`);

    try {
      const res = await fetch("/api/bot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: auth.token,
          accountId: auth.selectedAccount?.accountId,
          botCode: bot.code,
          botName: bot.name,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        startBot();
        addLog("success", data.message || `Bot "${bot.name}" started successfully`);
        if (data.mode === "local") {
          addLog("info", "Running in local simulation mode — no external engine configured");
        }
        if (auth.selectedAccount) {
          addLog("info", `Account: ${auth.selectedAccount.accountId} | Balance: $${parseFloat(auth.selectedAccount.balance).toFixed(2)} ${auth.selectedAccount.currency}`);
        }
      } else {
        addLog("error", data.error || "Failed to start bot");
      }
    } catch (err) {
      addLog("error", "Network error — could not reach bot engine");
    }
  };

  return (
    <>
      <button
        onClick={handleRun}
        disabled={!bot && !isRunning}
        className={`
          relative px-6 py-2.5 rounded-md font-semibold text-sm transition-all duration-200
          ${
            isRunning
              ? "bg-danger/20 border border-danger/50 text-danger hover:bg-danger/30"
              : bot
              ? "bg-green-600 text-bg hover:bg-green-600/90 hover:shadow-green-600/30 active:scale-[0.98]"
              : "bg-surface border border-border-border text-muted cursor-not-allowed opacity-50"
          }
        `}
      >
        {isRunning ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            Stop Bot
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run Bot
          </span>
        )}
      </button>

      {/* Auth Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full mx-4 animate-slide-up shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77-.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Authentication Required</h3>
                <p className="text-xs text-muted">
                  You haven't signed in via Deriv
                </p>
              </div>
            </div>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Please log in to connect your account to authorize bot operations. Your Deriv credentials are required to execute trades on your behalf.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAuthModal(false)}
                className="flex-1 px-4 py-2 rounded-md border border-border text-sm text-muted 
                  hover:bg-surface/80 transition-colors"
              >
                Cancel
              </button>
              <a
                href="/api/auth/deriv"
                className="flex-1 px-4 py-2 rounded-md bg-green-600 text-bg text-sm font-semibold 
                  text-center hover:bg-green-600/90 transition-colors hover:shadow-green-600/30"
              >
                Connect Deriv Account
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
