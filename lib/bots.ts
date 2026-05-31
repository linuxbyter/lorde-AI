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
    symbol: "R_100",
    features: [
      "Bollinger Bands + RSI confluence",
      "3-ladder entry system ($10/$15/$20)",
      "20% drawdown killswitch",
      "Max 3 open trades, 10/hour",
    ],
    code: `// 3P_Strategy_Bot.js
// Probability + Patience + Protection
// Hybrid: WS for streaming, REST for trading

module.exports = async function runBot(token, accountId, appId) {
  console.log("[3P BOT] Starting 3P Strategy Bot");
  console.log("[3P BOT] Account: " + accountId);

  var CONFIG = {
    symbol: "R_100",
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
    currency: "USD",
    openTrades: [],
    closedTrades: [],
    tickHistory: [],
    isAuthorized: false,
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

  async function executeTrade(signal, stake, ws, requestId) {
    try {
      console.log("[3P BOT] Executing trade via REST: " + signal + " $" + stake);
      var res = await fetch("https://api.derivws.com/trading/v1/options/accounts/" + accountId + "/contracts", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Deriv-App-ID": appId,
        },
        body: JSON.stringify({
          amount: stake,
          basis: "stake",
          contract_type: signal,
          currency: state.currency,
          duration: CONFIG.duration,
          duration_unit: CONFIG.durationUnit,
          underlying_symbol: CONFIG.symbol,
        }),
      });
      var tradeData = await res.json();
      console.log("[3P BOT] REST response:", JSON.stringify(tradeData).substring(0, 500));

      if (tradeData.error) {
        console.error("[3P BOT] Trade error:", tradeData.error.message || JSON.stringify(tradeData.error));
        return;
      }

      if (tradeData.data) {
        var d = tradeData.data;
        if (d.contract_id) {
          console.log("[3P BOT] Contract bought! ID: " + d.contract_id + " | Payout: $" + (d.payout || "?"));
          state.openTrades.push({ contractId: d.contract_id, buyPrice: d.buy_price || stake, entryTime: Date.now() });
          if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ proposal_open_contract: 1, contract_id: d.contract_id, subscribe: 1, req_id: requestId.value++ }));
          }
        } else if (d.id) {
          console.log("[3P BOT] Proposal received - Ask: $" + d.ask_price + ", Payout: $" + d.payout + ", ID: " + d.id);
          var buyRes = await fetch("https://api.derivws.com/trading/v1/options/accounts/" + accountId + "/contracts/" + d.id + "/buy", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + token,
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Deriv-App-ID": appId,
            },
            body: JSON.stringify({ price: d.ask_price }),
          });
          var buyData = await buyRes.json();
          console.log("[3P BOT] Buy response:", JSON.stringify(buyData).substring(0, 500));
          if (buyData.data && buyData.data.contract_id) {
            console.log("[3P BOT] Contract bought! ID: " + buyData.data.contract_id);
            state.openTrades.push({ contractId: buyData.data.contract_id, buyPrice: d.ask_price, entryTime: Date.now() });
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({ proposal_open_contract: 1, contract_id: buyData.data.contract_id, subscribe: 1, req_id: requestId.value++ }));
            }
          }
        }
      }
    } catch (err) {
      console.error("[3P BOT] Trade execution failed:", err.message);
    }
  }

  function evaluateAndTrade(currentPrice, ws, requestId) {
    var now = Date.now();
    if (state.lastSignalTime && now - state.lastSignalTime < 15000) return;
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
      console.log("[3P BOT] Ladder " + (ladder + 1) + "/3 - executing trade for $" + stake);
      state.tradesThisHour++;
      executeTrade(signal, stake, ws, requestId);
    }
  }

  function handleMessage(msg, ws, requestId) {
    if (msg.balance) {
      state.balance = parseFloat(msg.balance.balance);
      if (msg.balance.currency) state.currency = msg.balance.currency;
      if (CONFIG.sessionStartBalance === 0) CONFIG.sessionStartBalance = state.balance;
      console.log("[3P BOT] Balance: $" + state.balance + " " + state.currency);
    }

    if (msg.tick) {
      var tick = parseFloat(msg.tick.quote);
      state.tickHistory.push(tick);
      if (state.tickHistory.length > 100) state.tickHistory.shift();
      if (state.tickHistory.length >= CONFIG.minTicksForSignal) evaluateAndTrade(tick, ws, requestId);
    }

    if (msg.error) {
      console.error("[3P BOT] Deriv error:", msg.error.message || JSON.stringify(msg.error));
    }

    if (msg.proposal_open_contract) {
      var contract = msg.proposal_open_contract;
      if (contract.status === "sold" || contract.is_expired === 1) {
        var pnl = contract.profit || 0;
        state.sessionPnL += pnl;
        var result = pnl >= 0 ? "WIN" : "LOSS";
        console.log("[3P BOT] Contract closed | P&L: $" + pnl + " (" + result + ") | Session P&L: $" + state.sessionPnL);
        state.openTrades = state.openTrades.filter(function(t) { return t.contractId !== contract.contract_id; });
        state.closedTrades.push({ contractId: contract.contract_id, pnl: pnl, result: pnl >= 0 ? "win" : "loss", closedTime: Date.now() });
        var startBalance = CONFIG.sessionStartBalance;
        var currentBalance = state.balance;
        if (startBalance > 0) {
          var dd = Math.abs(currentBalance - startBalance) / startBalance;
          if (dd > CONFIG.maxDrawdown) {
            console.warn("[3P BOT] DRAWDOWN LIMIT HIT! (" + (dd * 100).toFixed(1) + "% > " + (CONFIG.maxDrawdown * 100) + "%) Stopping bot.");
            ws.close();
          }
        }
      }
    }
  }

  async function getOtp() {
    var otpRes = await fetch("https://api.derivws.com/trading/v1/options/accounts/" + accountId + "/otp", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token, "Deriv-App-ID": appId, "Content-Type": "application/json" },
    });
    if (!otpRes.ok) {
      var errText = await otpRes.text();
      throw new Error("OTP failed (" + otpRes.status + "): " + errText.substring(0, 200));
    }
    var otpData = await otpRes.json();
    if (!otpData.data || !otpData.data.url) throw new Error("OTP response missing URL");
    return otpData.data.url;
  }

  function connectLoop() {
    getOtp().then(function(wsUrl) {
      console.log("[3P BOT] Connecting to WebSocket for streaming...");
      var ws = new WebSocket(wsUrl);
      var requestId = { value: 1 };

      ws.on("open", function() {
        console.log("[3P BOT] WebSocket connected");
        state.isAuthorized = true;
        ws.send(JSON.stringify({ balance: 1, subscribe: 1, req_id: requestId.value++ }));
        ws.send(JSON.stringify({ ticks: CONFIG.symbol, subscribe: 1, req_id: requestId.value++ }));
      });

      ws.on("message", function(data) {
        try {
          var parsed = JSON.parse(data.toString());
          if (!parsed.tick && parsed.msg_type !== "balance" && parsed.msg_type !== "tick") {
            console.log("[3P BOT] WS:", parsed.msg_type || "unknown", JSON.stringify(parsed).substring(0, 400));
          }
          handleMessage(parsed, ws, requestId);
        } catch (err) { console.error("[3P BOT] Parse error:", err.message); }
      });

      ws.on("error", function(err) {
        console.error("[3P BOT] WebSocket error:", err.message);
      });

      ws.on("close", function(code, reason) {
        console.log("[3P BOT] WebSocket closed - code: " + code + " reason: " + (reason ? reason.toString() : "none"));
        state.isAuthorized = false;
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
  return new Promise(function() {});
};`,
  },
];
