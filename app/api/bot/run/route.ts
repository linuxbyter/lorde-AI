import { NextRequest } from "next/server";
import vm from "vm";
const WsModule = require("ws");

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, accountId, botCode, botName } = body;

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

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let pingInterval: ReturnType<typeof setInterval> | null = null;

      const sendEvent = (data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      const cleanup = () => {
        closed = true;
        if (pingInterval) clearInterval(pingInterval);
        try { controller.close(); } catch {}
      };

      // Set up sandbox context
      const moduleObj = { exports: {} as any };
      let botWs: any = null;

      const sandbox: Record<string, any> = {
        module: moduleObj,
        exports: moduleObj.exports,
        console: {
          log: (...args: any[]) => sendEvent({ type: "log", message: args.join(" ") }),
          error: (...args: any[]) => sendEvent({ type: "error", message: args.join(" ") }),
          warn: (...args: any[]) => sendEvent({ type: "warn", message: args.join(" ") }),
        },
        fetch: globalThis.fetch,
        WebSocket: WsModule,
        setInterval: (fn: Function, ms: number) => {
          return setInterval(() => { try { fn(); } catch {} }, ms);
        },
        setTimeout: (fn: Function, ms: number) => setTimeout(fn, ms),
        clearTimeout: clearTimeout,
        clearInterval: clearInterval,
        Date: Date,
        Math: Math,
        JSON: JSON,
        parseFloat: parseFloat,
        parseInt: parseInt,
        isNaN: isNaN,
        Infinity: Infinity,
        Buffer: Buffer,
        ArrayBuffer: ArrayBuffer,
        Uint8Array: Uint8Array,
        URL: URL,
        URLSearchParams: URLSearchParams,
        encodeURIComponent: encodeURIComponent,
        decodeURIComponent: decodeURIComponent,
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
        // Try to close any open WebSocket
        if (botWs && typeof botWs.close === "function") {
          try { botWs.close(); } catch {}
        }
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
