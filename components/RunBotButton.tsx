"use client";

import { useBotState } from "@/lib/botStore";
import { useAuth } from "@/lib/authContext";
import { useState, useRef } from "react";

export default function RunBotButton() {
  const { bot, isRunning, startBot, stopBot, addLog } = useBotState();
  const { auth } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleRun = async () => {
    if (!auth.authenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!bot) {
      addLog("warning", "No bot loaded. Please select a bot first.");
      return;
    }

    if (isRunning) {
      // Stop — abort the SSE connection
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      stopBot();
      addLog("info", "Bot stopped by user");
      return;
    }

    addLog("info", `Connecting to Deriv account ${auth.selectedAccount?.accountId ?? ""}...`);
    startBot();

    const abortController = new AbortController();
    abortRef.current = abortController;

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
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        addLog("error", errData.error || `Server error: ${res.status}`);
        stopBot();
        return;
      }

      if (!res.body) {
        addLog("error", "No response stream from server");
        stopBot();
        return;
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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
              addLog(msgType as any, data.message);
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        addLog("error", `Connection error: ${err.message}`);
      }
    } finally {
      stopBot();
      abortRef.current = null;
    }
  };

  return (
    <>
      <button
        onClick={handleRun}
        disabled={!bot && !isRunning}
        className={`
          relative px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-md font-semibold text-xs sm:text-sm transition-all duration-200
          ${
            isRunning
              ? "bg-terminal-danger/20 border border-terminal-danger/50 text-terminal-danger hover:bg-terminal-danger/30"
              : bot
              ? "bg-terminal-glow text-terminal-bg hover:bg-terminal-glow/90 hover:shadow-glow active:scale-[0.98]"
              : "bg-terminal-surface border border-terminal-border text-terminal-muted cursor-not-allowed opacity-50"
          }
        `}
      >
        {isRunning ? (
          <span className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 rounded-full bg-terminal-danger animate-pulse" />
            Stop Bot
          </span>
        ) : (
          <span className="flex items-center gap-1.5 sm:gap-2">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run Bot
          </span>
        )}
      </button>

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 sm:p-6 max-w-sm w-full animate-slide-up shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-terminal-danger/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-terminal-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm">Authentication Required</h3>
                <p className="text-[10px] sm:text-xs text-terminal-muted">
                  You haven&apos;t signed in via Deriv
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-terminal-muted mb-6 leading-relaxed">
              Please log in to connect your account to authorize bot operations.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAuthModal(false)}
                className="flex-1 px-4 py-2 rounded-md border border-terminal-border text-xs sm:text-sm text-terminal-muted 
                  hover:bg-terminal-surface/80 transition-colors"
              >
                Cancel
              </button>
              <a
                href="/api/auth/deriv"
                className="flex-1 px-4 py-2 rounded-md bg-terminal-glow text-terminal-bg text-xs sm:text-sm font-semibold 
                  text-center hover:bg-terminal-glow/90 transition-colors hover:shadow-glow"
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
