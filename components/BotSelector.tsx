"use client";

import { useState } from "react";
import { useBotState, BotFile } from "@/lib/botStore";
import { BOTS, BotDefinition } from "@/lib/bots";

export default function BotSelector() {
  const { setBot, addLog, bot } = useBotState();
  const [showList, setShowList] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotDefinition | null>(null);

  const handleSelectBot = (botDef: BotDefinition) => {
    setSelectedBot(botDef);
    const botFile: BotFile = {
      name: botDef.name,
      code: botDef.code,
      loadedAt: new Date().toISOString(),
    };
    setBot(botFile);
    addLog("success", `Bot loaded: ${botDef.name} (${botDef.strategy})`);
    setShowList(false);
  };

  const handleUnload = () => {
    setSelectedBot(null);
    setBot(null);
    addLog("info", "Bot unloaded");
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        onClick={() => setShowList(!showList)}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md border border-terminal-border bg-terminal-surface
          hover:border-terminal-glow/50 hover:bg-terminal-surface/80 transition-all text-xs sm:text-sm"
      >
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span>{selectedBot ? "Change Bot" : "Select Bot"}</span>
      </button>

      {selectedBot && (
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-glow shrink-0" />
          <span className="text-terminal-muted font-mono truncate max-w-[120px] sm:max-w-none">{selectedBot.name}</span>
          <button
            onClick={handleUnload}
            className="text-terminal-muted hover:text-terminal-danger transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {showList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 sm:p-6 max-w-lg w-full animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm sm:text-base text-terminal-text">Select Trading Bot</h3>
              <button
                onClick={() => setShowList(false)}
                className="text-terminal-muted hover:text-terminal-danger transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {BOTS.map((botDef) => (
                <div
                  key={botDef.id}
                  className={`rounded-lg border p-3 sm:p-4 cursor-pointer transition-all ${
                    selectedBot?.id === botDef.id
                      ? "border-terminal-glow bg-terminal-glow/10"
                      : "border-terminal-border hover:border-terminal-glow/30 hover:bg-terminal-surface/50"
                  }`}
                  onClick={() => handleSelectBot(botDef)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm text-terminal-text">{botDef.name}</h4>
                      <p className="text-[10px] sm:text-xs text-terminal-muted mt-0.5">{botDef.description}</p>
                    </div>
                    <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                      botDef.difficulty === "Beginner" ? "bg-terminal-glow/20 text-terminal-glow" :
                      botDef.difficulty === "Intermediate" ? "bg-terminal-accent/20 text-terminal-accent" :
                      "bg-terminal-danger/20 text-terminal-danger"
                    }`}>
                      {botDef.difficulty}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <span className="text-[9px] sm:text-[10px] text-terminal-glow bg-terminal-glow/10 px-1.5 py-0.5 rounded">
                      {botDef.strategy}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-terminal-muted bg-terminal-surface/50 px-1.5 py-0.5 rounded">
                      {botDef.symbol}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${
                      botDef.riskLevel === "Low" ? "text-terminal-glow bg-terminal-glow/10" :
                      botDef.riskLevel === "Medium" ? "text-terminal-accent bg-terminal-accent/10" :
                      "text-terminal-danger bg-terminal-danger/10"
                    }`}>
                      {botDef.riskLevel} Risk
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    {botDef.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-1 text-[9px] sm:text-[10px] text-terminal-muted">
                        <span className="text-terminal-glow shrink-0">+</span>
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
