"use client";

import { useEffect, useRef, useState } from "react";
import { useBotState } from "@/lib/botStore";

const typeColors: Record<string, string> = {
  info: "text-terminal-muted",
  success: "text-terminal-glow",
  warning: "text-terminal-accent",
  error: "text-terminal-danger",
  trade: "text-blue-400",
};

const typeLabels: Record<string, string> = {
  info: "INF",
  success: "OK ",
  warning: "WRN",
  error: "ERR",
  trade: "TRD",
};

export default function ConsoleLog() {
  const { logs, clearLogs, isRunning } = useBotState();
  const endRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    const el = endRef.current?.parentElement;
    if (el) {
      const threshold = 60;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      if (isNearBottom) {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [logs]);

  const filteredLogs = showAll
    ? logs
    : logs.filter(
        (l) =>
          l.type === "success" ||
          l.type === "error" ||
          l.type === "warning" ||
          l.type === "trade"
      );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 border-b border-terminal-border bg-terminal-surface/50">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-terminal-muted">
            Console
          </span>
          {isRunning && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-terminal-glow/20 text-[10px] text-terminal-glow font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-glow animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              showAll
                ? "text-terminal-muted hover:text-terminal-text"
                : "text-terminal-glow bg-terminal-glow/10"
            }`}
          >
            {showAll ? "Key Only" : "All"}
          </button>
          <button
            onClick={clearLogs}
            className="text-[9px] sm:text-[10px] text-terminal-muted hover:text-terminal-danger transition-colors uppercase tracking-wider"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 font-mono text-[10px] sm:text-xs leading-relaxed min-h-0">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-terminal-muted text-[10px] sm:text-xs">
            <div className="text-center">
              <div className="text-xl sm:text-2xl mb-2 opacity-30">{">"}</div>
              <div>Waiting for activity...</div>
            </div>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="log-entry flex gap-1.5 sm:gap-2 py-0.5 hover:bg-white/[0.02]">
              <span className="text-terminal-muted select-none shrink-0 hidden sm:inline">
                {new Date(log.timestamp).toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span className="text-terminal-muted select-none shrink-0 sm:hidden">
                {new Date(log.timestamp).toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                className={`font-bold select-none shrink-0 ${typeColors[log.type]}`}
              >
                [{typeLabels[log.type]}]
              </span>
              <span className={`${typeColors[log.type]} break-all`}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
