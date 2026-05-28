"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-terminal-glow/5 rounded-full blur-[120px]" />

      {/* Content */}
      <div
        className={`relative z-10 text-center transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Logo / Brand */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-terminal-border bg-terminal-surface/50 mb-6">
            <span className="w-2 h-2 rounded-full bg-terminal-glow animate-pulse-glow" />
            <span className="text-xs text-terminal-muted tracking-widest uppercase">
              System Online
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
            <span className="text-terminal-text">Lorde</span>{" "}
            <span className="text-terminal-glow glow-text">Core</span>
          </h1>
          <h2 className="text-xl md:text-2xl text-terminal-muted font-light tracking-wide">
            Bot Terminal
          </h2>
        </div>

        {/* Tagline */}
        <p className="text-terminal-muted text-sm md:text-base max-w-md mx-auto mb-12 leading-relaxed">
          Deploy automated trading bots on Deriv. Connect your account, load
          your strategy, and execute in a single cockpit interface.
        </p>

        {/* CTA */}
        <button
          onClick={() => router.push("/dashboard")}
          className="group relative px-8 py-3.5 bg-terminal-glow text-terminal-bg font-semibold rounded-lg 
            hover:bg-terminal-glow/90 transition-all duration-300 hover:shadow-glow-lg
            active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-2">
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

        {/* Footer info */}
        <div className="mt-16 flex items-center gap-6 text-xs text-terminal-muted">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-glow" />
            Deriv OAuth
          </span>
          <span className="w-px h-3 bg-terminal-border" />
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-accent" />
            Bot Engine
          </span>
          <span className="w-px h-3 bg-terminal-border" />
          <span className="flex items-center gap-2">
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
