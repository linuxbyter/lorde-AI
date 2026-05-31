"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Background grid */}
      <div className="absolute inset-0 grid-bg" />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-terminal-glow/5 rounded-full blur-[100px] sm:blur-[120px]" />

      {/* Content */}
      <div
        className={`relative z-10 text-center transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-terminal-border bg-terminal-surface/50 mb-6 sm:mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-glow animate-pulse-glow" />
          <span className="text-[10px] sm:text-xs text-terminal-muted tracking-widest uppercase">
            System Online
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-3 sm:mb-4">
          <span className="text-terminal-text">Lorde</span>{" "}
          <span className="text-terminal-glow glow-text">AI</span>
        </h1>
        <h2 className="text-base sm:text-xl md:text-2xl text-terminal-muted font-light tracking-wide mb-6 sm:mb-8">
          Trading Terminal
        </h2>

        {/* Tagline */}
        <p className="text-terminal-muted text-xs sm:text-sm md:text-base max-w-sm sm:max-w-md mx-auto mb-8 sm:mb-12 leading-relaxed">
          Deploy automated trading bots on Deriv. Connect your account, load
          your strategy, and execute — all from one terminal.
        </p>

        {/* CTA */}
        <button
          onClick={() => router.push("/dashboard")}
          className="group relative px-6 sm:px-8 py-3 sm:py-3.5 bg-terminal-glow text-terminal-bg font-semibold rounded-lg 
            hover:bg-terminal-glow/90 transition-all duration-300 hover:shadow-glow-lg
            active:scale-[0.98] text-sm sm:text-base"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Launch Terminal
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </span>
        </button>

        {/* Feature badges */}
        <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-terminal-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-glow" />
            Deriv OAuth
          </span>
          <span className="w-px h-3 bg-terminal-border hidden sm:block" />
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-accent" />
            Bot Engine
          </span>
          <span className="w-px h-3 bg-terminal-border hidden sm:block" />
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-glow" />
            Real-time Logs
          </span>
        </div>
      </div>

      {/* Bottom scan line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-terminal-glow/30 to-transparent" />
    </div>
  );
}
