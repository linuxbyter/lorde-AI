import { NextRequest } from "next/server";
import vm from "vm";
const WsModule = require("ws");

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { accountId, botCode, botName } = body;

  // Read token from httpOnly cookie (not from request body)
  const token = request.cookies.get("deriv_token")?.value;

  if (!token || !accountId) {
    return new Response(
      JSON.stringify({ error: "Authentication required. Please connect your Deriv account." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!botCode) {
    return new Response(
      JSON.stringify({ error: "No bot loaded. Please select a bot first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const BOT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let pingInterval: ReturnType<typeof setInterval> | null = null;
      let statsInterval: ReturnType<typeof setInterval> | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let activeWs: any = null;

      const sendEvent = (data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pingInterval) clearInterval(pingInterval);
        if (statsInterval) clearInterval(statsInterval);
        if (timeoutId) clearTimeout(timeoutId);
        if (activeWs && typeof activeWs.close === "function") {
          try { activeWs.close(); } catch {}
        }
        try { controller.close(); } catch {}
      };

      // Timeout safety net
      timeoutId = setTimeout(() => {
        sendEvent({ type: "warn", message: `Bot timed out after ${BOT_TIMEOUT_MS / 1000}s` });
        cleanup();
      }, BOT_TIMEOUT_MS);

      // Set up sandbox context
      const moduleObj = { exports: {} as any };

      const sandbox: Record<string, any> = {
        module: moduleObj,
        exports: moduleObj.exports,
        console: {
          log: (...args: any[]) => sendEvent({ type: "log", message: args.join(" ") }),
          error: (...args: any[]) => sendEvent({ type: "error", message: args.join(" ") }),
          warn: (...args: any[]) => sendEvent({ type: "warn", message: args.join(" ") }),
        },
        // Network — restricted to Deriv only
        fetch: async (url: string | Request, init?: RequestInit) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          if (!urlStr.includes("derivws.com") && !urlStr.includes("auth.deriv.com")) {
            throw new Error("Network access restricted to Deriv API only");
          }
          return globalThis.fetch(url, init);
        },
        WebSocket: WsModule,
        // Timer APIs
        setInterval: (fn: Function, ms: number) => {
          const id = setInterval(() => { try { fn(); } catch {} }, ms);
          return id;
        },
        setTimeout: (fn: Function, ms: number) => setTimeout(fn, ms),
        clearTimeout: clearTimeout,
        clearInterval: clearInterval,
        // Core JS globals
        Date: Date,
        Math: Math,
        JSON: JSON,
        parseFloat: parseFloat,
        parseInt: parseInt,
        isNaN: isNaN,
        Infinity: Infinity,
        NaN: NaN,
        undefined: undefined,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Map: Map,
        Set: Set,
        RegExp: RegExp,
        Error: Error,
        TypeError: TypeError,
        RangeError: RangeError,
        Promise: Promise,
        Symbol: Symbol,
        ArrayBuffer: ArrayBuffer,
        Uint8Array: Uint8Array,
        Int8Array: Int8Array,
        TextDecoder: TextDecoder,
        TextEncoder: TextEncoder,
        URL: URL,
        URLSearchParams: URLSearchParams,
        encodeURIComponent: encodeURIComponent,
        decodeURIComponent: decodeURIComponent,
        encodeURI: encodeURI,
        decodeURI: decodeURI,
        Buffer: Buffer,
        globalThis: {},
        // Module system
        require: (mod: string) => {
          if (mod === "ws") return WsModule;
          throw new Error(`Module "${mod}" is not available in sandbox`);
        },
        process: {
          exit: (code: number) => {
            sendEvent({ type: "warn", message: `Bot process exited with code ${code}` });
            cleanup();
          },
        },
        arguments: [],
      };

      // Make globalThis reference itself
      sandbox.globalThis = sandbox;

      const context = vm.createContext(sandbox);

      // Run bot code to define the function
      try {
        const script = new vm.Script(botCode, { filename: `${botName || "bot"}.js` });
        script.runInContext(context);
      } catch (err: any) {
        sendEvent({ type: "error", message: `Syntax error in bot code: ${err.message}` });
        cleanup();
        return;
      }

      const runBot = moduleObj.exports;
      if (typeof runBot !== "function") {
        sendEvent({ type: "error", message: "Bot code did not export a function (expected module.exports = async function runBot(...))" });
        cleanup();
        return;
      }

      sendEvent({ type: "info", message: `Bot "${botName}" started on account ${accountId}` });

      // Execute the bot
      runBot(token, accountId, process.env.NEXT_PUBLIC_DERIV_APP_ID || "33owq0MRuV9ahlgyDTUS7")
        .then(() => {
          sendEvent({ type: "info", message: "Bot finished execution" });
          cleanup();
        })
        .catch((err: any) => {
          sendEvent({ type: "error", message: `Bot runtime error: ${err.message || err}` });
          cleanup();
        });

      // Keep-alive ping every 30s
      pingInterval = setInterval(() => {
        sendEvent({ type: "ping" });
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        sendEvent({ type: "warn", message: "Client disconnected, stopping bot..." });
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
