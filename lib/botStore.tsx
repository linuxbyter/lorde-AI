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
  type: "info" | "success" | "warning" | "error" | "trade";
  message: string;
}

export interface BotState {
  bot: BotFile | null;
  isRunning: boolean;
  logs: LogEntry[];
  setBot: (bot: BotFile | null) => void;
  startBot: () => void;
  stopBot: () => void;
  addLog: (type: LogEntry["type"], message: string) => void;
  clearLogs: () => void;
}

const BotStateContext = createContext<BotState | null>(null);

export function BotStateProvider({ children }: { children: ReactNode }) {
  const [bot, setBotState] = useState<BotFile | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

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
      setLogs((prev) => [...prev.slice(-200), entry]);
    },
    []
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  return (
    <BotStateContext.Provider
      value={{ bot, isRunning, logs, setBot, startBot, stopBot, addLog, clearLogs }}
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
