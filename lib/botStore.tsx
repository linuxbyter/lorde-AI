"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export interface BotFile {
  name: string;
  code: string;
  loadedAt: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "trade" | "signal";
  message: string;
}

export interface TradeStats {
  totalPnL: number;
  winCount: number;
  lossCount: number;
  closedCount: number;
  openCount: number;
  winRate: number;
}

export interface BotState {
  bot: BotFile | null;
  isRunning: boolean;
  logs: LogEntry[];
  stats: TradeStats;
  setBot: (bot: BotFile | null) => void;
  startBot: () => void;
  stopBot: () => void;
  addLog: (type: LogEntry["type"], message: string) => void;
  clearLogs: () => void;
  updateStats: (partial: Partial<TradeStats> | ((prev: TradeStats) => Partial<TradeStats>)) => void;
}

const BotStateContext = createContext<BotState | null>(null);

export function BotStateProvider({ children }: { children: ReactNode }) {
  const [bot, setBotState] = useState<BotFile | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<TradeStats>({
    totalPnL: 0,
    winCount: 0,
    lossCount: 0,
    closedCount: 0,
    openCount: 0,
    winRate: 0,
  });

  const setBot = useCallback((newBot: BotFile | null) => {
    setBotState(newBot);
  }, []);

  const startBot = useCallback(() => setIsRunning(true), []);
  const stopBot = useCallback(() => setIsRunning(false), []);

  const addLog = useCallback(
    (type: LogEntry["type"], message: string) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type,
        message,
      };
      setLogs((prev) => [...prev.slice(-500), entry]);
    },
    []
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  const updateStats = useCallback((partial: Partial<TradeStats> | ((prev: TradeStats) => Partial<TradeStats>)) => {
    setStats((prev) => {
      const updates = typeof partial === "function" ? partial(prev) : partial;
      const next = { ...prev, ...updates };
      next.winRate = next.closedCount > 0
        ? Math.round((next.winCount / next.closedCount) * 100)
        : 0;
      return next;
    });
  }, []);

  return (
    <BotStateContext.Provider
      value={{ bot, isRunning, logs, stats, setBot, startBot, stopBot, addLog, clearLogs, updateStats }}
    >
      {children}
    </BotStateContext.Provider>
  );
}

export function useBotState(): BotState {
  const ctx = useContext(BotStateContext);
  if (!ctx) throw new Error("useBotState must be used within BotStateProvider");
  return ctx;
}
