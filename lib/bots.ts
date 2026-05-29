export interface BotDefinition {
  id: string;
  name: string;
  description: string;
  strategy: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  riskLevel: "Low" | "Medium" | "High";
  symbol: string;
  features: string[];
  code: string;
}

export const BOTS: BotDefinition[] = [
  {
    id: "3p-strategy",
    name: "3P Strategy Bot",
    description: "Probability + Patience + Protection. Bollinger Bands + RSI with 3-ladder entry system.",
    strategy: "Bollinger Bands + RSI",
    difficulty: "Intermediate",
    riskLevel: "Medium",
    symbol: "1HZ100V",
    features: [
      "Bollinger Bands + RSI confluence",
      "3-ladder entry system ($10/$15/$20)",
      "20% drawdown killswitch",
      "Max 3 open trades, 10/hour",
    ],
    code: `// 3P_Strategy_Bot.js
// Probability + Patience + Protection

module.exports = async function runBot(token, accountId, appId) {
  console.log("[3P BOT] Starting 3P Strategy Bot");
  console.log("[3P BOT] Account: " + accountId);

  var CONFIG = {
    symbol: "1HZ100V",
    baseBet: 10,
    ladder: [10, 15, 20],
    duration: 60,
    durationUnit: "s",
    bbPeriod: 20,
    bbStdDev: 2,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    maxDrawdown: 0.20,
    maxOpenTrades: 3,
    sessionStartBalance: 0,
    minTicksForSignal: 25,
    maxTradesPerHour: 10,
    reconnectDelay: 3000,
  };

  var state = {
    balance: 0,
    openTrades: [],
    closedTrades: [],
    tickHistory: [],
    isConnected: false,
    lastSignalTime: null,
    tradesThisHour: 0,
    sessionPnL: 0,
  };

  var WebSocket = require("ws");

  function calculateBollingerBands(prices, period, stdDev) {
    if (prices.length < period) return null;
    var recent = prices.slice(-period);
    var mean = recent.reduce(function(a, b) { return a + b; }) / period;
    var variance = recent.reduce(function(sum, price) { return sum + Math.pow(price - mean, 2); }, 0) / period;
    var std = Math.sqrt(variance);
    return { upper: mean + stdDev * std, middle: mean, lower: mean - stdDev * std };
  }

  function calculateRSI(prices, period) {
    if (prices.length < period + 1) return 50;
    var gains = [];
    var losses = [];
    for (var i = Math.max(1, prices.length - period); i < prices.length; i++) {
      var delta = prices[i] - prices[i - 1];
      gains.push(delta > 0 ? delta : 0);
      losses.push(delta < 0 ? -delta : 0);
    }
    var avgGain = gains.reduce(function(a, b) { return a + b; }, 0) / period;
    var avgLoss = losses.reduce(function(a, b) { return a + b; }, 0) / period;
    if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
    var rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  function evaluateAndTrade(currentPrice, ws, requestId, pendingRequests) {
    var now = Date.now();
    if (state.lastSignalTime && now - state.lastSignalTime < 5000) return;
    if (state.openTrades.length >= CONFIG.maxOpenTrades) return;
    if (state.tradesThisHour >= CONFIG.maxTradesPerHour) return;

    var bb = calculateBollingerBands(state.tickHistory, CONFIG.bbPeriod, CONFIG.bbStdDev);
    var rsi = calculateRSI(state.tickHistory, CONFIG.rsiPeriod);
    if (!bb) return;

    console.log("[3P BOT] Indicators - Price: $" + currentPrice.toFixed(2) + ", RSI: " + rsi.toFixed(1) + ", BB: [" + bb.lower.toFixed(2) + ", " + bb.middle.toFixed(2) + ", " + bb.upper.toFixed(2) + "]");

    var signal = null;
    var ladder = 0;
    var confidence = 0;

    if (currentPrice < bb.lower && rsi < CONFIG.rsiOversold) {
      signal = "CALL"; confidence = 0.85; ladder = 0;
      console.log("[3P BOT] SIGNAL: CALL (Price oversold, RSI " + rsi.toFixed(1) + ")");
    } else if (currentPrice > bb.upper && rsi > CONFIG.rsiOverbought) {
      signal = "PUT"; confidence = 0.85; ladder = 0;
      console.log("[3P BOT] SIGNAL: PUT (Price overbought, RSI " + rsi.toFixed(1) + ")");
    }

    if (!signal) {
      if (currentPrice < bb.lower - (bb.upper - bb.lower) * 0.1 && rsi < 45) {
        signal = "CALL"; confidence = 0.65; ladder = 1;
        console.log("[3P BOT] SIGNAL: CALL (Weak, Price below BB)");
      } else if (currentPrice > bb.upper + (bb.upper - bb.lower) * 0.1 && rsi > 55) {
        signal = "PUT"; confidence = 0.65; ladder = 1;
        console.log("[3P BOT] SIGNAL: PUT (Weak, Price above BB)");
      }
    }

    if (signal && confidence >= 0.65) {
      state.lastSignalTime = now;
      var stake = CONFIG.ladder[ladder];
      console.log("[3P BOT] Executing " + signal + " with ladder " + (ladder + 1) + "/3 ($" + stake + ")");
      var reqId = requestId.value++;
      var proposalPayload = {
        proposal: 1,
        amount: stake,
        basis: "stake",
        contract_type: signal,
        currency: "USD",
        duration: CONFIG.duration,
        duration_unit: CONFIG.durationUnit,
        underlying_symbol: CONFIG.symbol,
        req_id: reqId,
      };
      console.log("[3P BOT] Sending proposal:", JSON.stringify(proposalPayload));
      ws.send(JSON.stringify(proposalPayload));
      pendingRequests[reqId] = { type: "proposal", time: Date.now() };
      state.tradesThisHour++;
    }
  }

  function handleMessage(msg, ws, requestId, pendingRequests) {
    if (msg.balance) {
      state.balance = parseFloat(msg.balance.balance);
      if (CONFIG.sessionStartBalance === 0) CONFIG.sessionStartBalance = state.balance;
      console.log("[3P BOT] Balance: $" + state.balance);
    }
    if (msg.tick) {
      var tick = parseFloat(msg.tick.quote);
      state.tickHistory.push(tick);
      if (state.tickHistory.length > 100) state.tickHistory.shift();
      if (state.tickHistory.length >= CONFIG.minTicksForSignal) evaluateAndTrade(tick, ws, requestId, pendingRequests);
    }
    if (msg.proposal) {
      var reqId = msg.req_id;
      var pending = pendingRequests[reqId];
      if (pending) {
        delete pendingRequests[reqId];
        console.log("[3P BOT] Proposal received: Ask $" + msg.proposal.ask_price + ", Payout $" + msg.proposal.payout + ", ID: " + msg.proposal.id);
        var buyPayload = { buy: msg.proposal.id, price: msg.proposal.ask_price, req_id: requestId.value++ };
        console.log("[3P BOT] Sending buy:", JSON.stringify(buyPayload));
        ws.send(JSON.stringify(buyPayload));
      } else {
        console.log("[3P BOT] Proposal with unknown req_id:", reqId);
      }
    }
    if (msg.error) {
      console.error("[3P BOT] Deriv error:", msg.error.message || JSON.stringify(msg.error));
    }
    if (msg.buy) {
      console.log("[3P BOT] Contract bought: " + msg.buy.contract_id + " | Buy price: $" + msg.buy.buy_price + " | Payout: $" + msg.buy.payout);
      state.openTrades.push({ contractId: msg.buy.contract_id, buyPrice: msg.buy.buy_price, entryTime: Date.now() });
      ws.send(JSON.stringify({ proposal_open_contract: 1, contract_id: msg.buy.contract_id, subscribe: 1, req_id: requestId.value++ }));
    }
    if (msg.proposal_open_contract) {
      var contract = msg.proposal_open_contract;
      if (contract.status === "sold" || contract.is_expired === 1) {
        var pnl = contract.profit || 0;
        state.sessionPnL += pnl;
        console.log("[3P BOT] Contract closed | P&L: $" + pnl + " (" + (pnl > 0 ? "WIN" : "LOSS") + ") | Session P&L: $" + state.sessionPnL);
        state.openTrades = state.openTrades.filter(function(t) { return t.contractId !== contract.contract_id; });
        state.closedTrades.push({ contractId: contract.contract_id, pnl: pnl, result: pnl > 0 ? "win" : "loss", closedTime: Date.now() });
        var startBalance = CONFIG.sessionStartBalance;
        var currentBalance = state.balance;
        var dd = Math.abs(currentBalance - startBalance) / startBalance;
        if (dd > CONFIG.maxDrawdown) {
          console.warn("[3P BOT] DRAWDOWN LIMIT HIT! (" + (dd * 100).toFixed(1) + "% > " + (CONFIG.maxDrawdown * 100) + "%) Stopping bot.");
          ws.close();
        }
      }
    }
  }

  async function getOtp() {
    var otpRes = await fetch("https://api.derivws.com/trading/v1/options/accounts/" + accountId + "/otp", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token, "Deriv-App-ID": appId, "Content-Type": "application/json" },
    });
    if (!otpRes.ok) throw new Error("OTP failed: " + otpRes.status);
    var otpData = await otpRes.json();
    return otpData.data.url;
  }

  function connectLoop() {
    getOtp().then(function(wsUrl) {
      console.log("[3P BOT] Connecting to WebSocket...");
      var ws = new WebSocket(wsUrl);
      var requestId = { value: 1 };
      var pendingRequests = {};

      ws.on("open", function() {
        console.log("[3P BOT] WebSocket connected");
        state.isConnected = true;
        ws.send(JSON.stringify({ balance: 1, subscribe: 1, req_id: requestId.value++ }));
        ws.send(JSON.stringify({ ticks: CONFIG.symbol, subscribe: 1, req_id: requestId.value++ }));
      });

      ws.on("message", function(data) {
        try {
          var raw = data.toString();
          var parsed = JSON.parse(raw);
          // Log everything except ticks for debugging
          if (!parsed.tick) {
            console.log("[3P BOT] WS MSG:", raw.substring(0, 500));
          }
          handleMessage(parsed, ws, requestId, pendingRequests);
        } catch (err) { console.error("[3P BOT] Parse error:", err.message); }
      });

      ws.on("error", function(err) {
        console.error("[3P BOT] WebSocket error:", err.message);
      });

      ws.on("close", function(code, reason) {
        console.log("[3P BOT] WebSocket closed - code: " + code + " reason: " + (reason ? reason.toString() : "none"));
        state.isConnected = false;
        setTimeout(connectLoop, CONFIG.reconnectDelay);
      });

      setInterval(function() {
        var winRate = state.closedTrades.length > 0
          ? (state.closedTrades.filter(function(t) { return t.result === "win"; }).length / state.closedTrades.length * 100).toFixed(1)
          : "0";
        console.log("[3P BOT] === STATS === Bal: $" + state.balance + " | P&L: $" + state.sessionPnL + " | Trades: " + state.closedTrades.length + " | Win: " + winRate + "% | Open: " + state.openTrades.length);
      }, 30000);
    }).catch(function(err) {
      console.error("[3P BOT] Connection error:", err.message, "- retrying in " + (CONFIG.reconnectDelay / 1000) + "s...");
      setTimeout(connectLoop, CONFIG.reconnectDelay);
    });
  }

  connectLoop();

  // Keep the bot alive forever
  return new Promise(function() {});
};`,
  },
];
