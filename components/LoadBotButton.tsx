"use client";

import { useCallback, useRef } from "react";
import { useBotState, BotFile } from "@/lib/botStore";

export default function LoadBotButton() {
  const { setBot, addLog, bot } = useBotState();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const code = e.target?.result as string;
        const botFile: BotFile = {
          name: file.name,
          code,
          loadedAt: new Date().toISOString(),
        };
        setBot(botFile);
        addLog("success", `Bot loaded: ${file.name} (${(code.length / 1024).toFixed(1)}KB)`);
      };
      reader.readAsText(file);
    },
    [setBot, addLog]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".js,.ts,.json,.bot"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md border border-terminal-border bg-terminal-surface
          hover:border-terminal-glow/50 hover:bg-terminal-surface/80 transition-all text-xs sm:text-sm"
      >
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Load Bot</span>
      </button>
      {bot && (
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-glow shrink-0" />
          <span className="text-terminal-muted font-mono truncate max-w-[100px] sm:max-w-none">{bot.name}</span>
          <button
            onClick={() => {
              setBot(null);
              addLog("info", "Bot unloaded");
            }}
            className="text-terminal-muted hover:text-terminal-danger transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
