# CLAUDE.md — Lorde Core Bot Terminal

## What This App Is

A Next.js 14 web terminal that connects to Deriv via OAuth 2.0 (PKCE), lets users select between real/demo accounts, and runs automated trading bots. Users authenticate through Deriv, pick their account, and bots execute trades via a backend engine.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Auth**: Deriv OAuth 2.0 with PKCE (Authorization Code flow)
- **API**: Deriv REST API at `https://api.derivws.com`
- **Bot Engine**: External Render service at `https://lorde-ai.onrender.com/api/v1/trade/direct`
- **State**: React Context (botStore) + custom hook (useAuth)
- **Cookies**: httpOnly, secure, sameSite=lax — all auth tokens stored server-side

## How Auth Works

1. User clicks "Connect" → redirects to `https://auth.deriv.com/oauth2/auth`
2. User logs in on Deriv → Deriv redirects back with `?code=...&state=...`
3. Server exchanges code for token at `https://auth.deriv.com/oauth2/token`
4. Server fetches accounts from `https://api.derivws.com/trading/v1/options/accounts`
5. Stores token + accounts in httpOnly cookies
6. User can switch between demo/real accounts via the "Change Account" modal

### Required Headers for ALL Deriv API Calls

```
Authorization: Bearer <ACCESS_TOKEN>
Deriv-App-ID: 33owq0MRuV9ahlgyDTUS7
Content-Type: application/json
```

## How Bot Trading Works

### Current Flow (what we have now)

1. User loads a `.js` file via "Load Bot" button (file read client-side)
2. User clicks "Run Bot" → sends bot code + token + accountId to `/api/bot/run`
3. Server forwards to Render engine: `POST https://lorde-ai.onrender.com/api/v1/trade/direct`
4. Engine receives `{ token, account_id, bot_code, bot_name }`

### How To Program Bots (what Claude should write)

Bots are JavaScript files that get sent as strings to the bot engine. The engine runs them server-side with access to the Deriv token and account ID.

**A bot file should export or contain logic that:**

1. **Connects to Deriv WebSocket** using the account's OTP
2. **Subscribes to market data** (ticks, candles, etc.)
3. **Implements trading strategy** (entry/exit signals)
4. **Executes trades** via WebSocket buy/sell commands
5. **Manages risk** (stop loss, take profit, position sizing)

### Deriv WebSocket Trading Flow

```
Step 1: Get OTP via REST
POST https://api.derivws.com/trading/v1/options/accounts/{accountId}/otp
Headers: Authorization: Bearer <token>, Deriv-App-ID: <app_id>
Response: { data: { url: "wss://api.derivws.com/trading/v1/options/ws/demo?otp=xxx" } }

Step 2: Connect to WebSocket
const ws = new WebSocket(otpResponse.data.url);

Step 3: Send trading commands via WebSocket
ws.send(JSON.stringify({ balance: 1, subscribe: 1, req_id: 1 }));
ws.send(JSON.stringify({ ticks: "1HZ100V", subscribe: 1, req_id: 2 }));
ws.send(JSON.stringify({
  proposal: 1,
  amount: 10,
  basis: "stake",
  contract_type: "CALL",
  currency: "USD",
  duration: 60,
  duration_unit: "s",
  underlying_symbol: "1HZ100V",
  subscribe: 1,
  req_id: 3
}));

Step 4: Buy contract (use proposal ID from response)
ws.send(JSON.stringify({ buy: "PROPOSAL_ID", price: 100, req_id: 4 }));

Step 5: Monitor contract
ws.send(JSON.stringify({
  proposal_open_contract: 1,
  contract_id: CONTRACT_ID,
  subscribe: 1,
  req_id: 5
}));
```

### Available Contract Types

- `CALL` / `PUT` — Rise/Fall
- `HIGHER` / `LOWER` — Higher/Lower (with barrier)
- `DIGITOVER` / `DIGITUNDER` — Over/Under (digits)
- `DIGITMATCH` / `DIGITDIFF` — Matches/Differs
- `MULTUP` / `MULTDOWN` — Multipliers (popular for bots)
- `TURBOSLONG` / `TURBOSSHORT` — Turbos
- `VANILLALONGCALL` / `VANILLALONGPUT` — Vanilla options

### Popular Underlying Symbols

- `1HZ100V` — Volatility 100 Index (synthetic, 24/7)
- `1HZ50V` — Volatility 50 Index
- `R_100` — Volatility 100 Index (legacy)
- `R_50` — Volatility 50 Index (legacy)
- `frxEURUSD` — EUR/USD forex
- `frxGBPUSD` — GBP/USD forex
- `frxXAUUSD` — Gold

### Bot Strategy Examples

**Simple Moving Average Crossover Bot:**
- Track short SMA (5 ticks) and long SMA (20 ticks)
- When short crosses above long → buy CALL
- When short crosses below long → buy PUT
- Use fixed stake amount
- Close after expiry or after N ticks

**Multiplier Bot (for MULTI contracts):**
- Set multiplier (e.g., 10x or 20x)
- Set stop loss and take profit
- Monitor open position via proposal_open_contract
- Close at target or stop loss

**Digit Prediction Bot:**
- Analyze last 5-10 ticks
- Predict next digit (0-9) using pattern matching
- Trade DIGITMATCH or DIGITDIFF

### Bot Code Template

```javascript
// bot-template.js
// This file gets sent as a string to the engine

module.exports = async function runBot(token, accountId, appId) {
  // Step 1: Get OTP
  const otpRes = await fetch(
    `https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Deriv-App-ID": appId,
        "Content-Type": "application/json"
      }
    }
  );
  const { data } = await otpRes.json();
  
  // Step 2: Connect WebSocket
  const ws = new WebSocket(data.url);
  
  ws.onopen = () => {
    console.log("Connected to Deriv WebSocket");
    // Subscribe to balance
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
    // Subscribe to ticks
    ws.send(JSON.stringify({ ticks: "1HZ100V", subscribe: 1 }));
  };
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    
    // Handle different message types
    if (msg.msg_type === "tick") {
      // Analyze tick, make trading decisions
    }
    if (msg.msg_type === "proposal") {
      // Got price proposal, decide to buy or not
      if (shouldBuy(msg.proposal)) {
        ws.send(JSON.stringify({
          buy: msg.proposal.id,
          price: 100
        }));
      }
    }
    if (msg.msg_type === "buy") {
      // Contract purchased, monitor it
      ws.send(JSON.stringify({
        proposal_open_contract: 1,
        contract_id: msg.buy.contract_id,
        subscribe: 1
      }));
    }
  };
}
```

## Key Rules for Bot Development

1. **NEVER hardcode tokens** — tokens come from the engine request body
2. **Always use the correct WebSocket endpoint** — demo accounts use `/ws/demo`, real use `/ws/real`
3. **Rate limit** — don't spam requests; Deriv has rate limits
4. **Handle disconnections** — implement reconnection logic
5. **Log everything** — use console.log for debugging, it streams to the dashboard console
6. **Risk management** — always implement stop losses and position sizing
7. **Test on demo first** — never test new strategies on real accounts

## File Structure

```
app/
  page.tsx                    — Landing page
  layout.tsx                  — Root layout
  dashboard/page.tsx          — Main workspace (cockpit)
  api/
    auth/
      deriv/route.ts          — OAuth PKCE redirect
      callback/route.ts       — Token exchange
      me/route.ts             — Auth status + accounts list
      select-account/route.ts — Switch demo/real
      logout/route.ts         — Clear session
    bot/
      run/route.ts            — Forward bot to engine
      balance/route.ts        — Fetch live balance
components/
  AuthStatus.tsx              — Account selector + modal
  RunBotButton.tsx            — Run/stop bot + auth gate
  LoadBotButton.tsx           — File upload for bot code
  ConsoleLog.tsx              — Real-time log stream
lib/
  useAuth.ts                  — Auth state hook
  botStore.tsx                — Bot state context
```

## Environment Variables

```
NEXT_PUBLIC_DERIV_APP_ID=33owq0MRuV9ahlgyDTUS7
NEXT_PUBLIC_BASE_URL=https://lorde-ai-plum.vercel.app
NEXT_PUBLIC_BOT_ENGINE_URL=https://lorde-ai.onrender.com/api/v1/trade/direct
```

## Deriv API Quick Reference

| Endpoint | Method | Headers Required | Purpose |
|----------|--------|-----------------|---------|
| `auth.deriv.com/oauth2/auth` | GET | — | OAuth redirect |
| `auth.deriv.com/oauth2/token` | POST | — | Token exchange |
| `api.derivws.com/trading/v1/options/accounts` | GET | Auth + App-ID | List accounts |
| `api.derivws.com/trading/v1/options/accounts/{id}/otp` | POST | Auth + App-ID | Get WebSocket URL |
| `wss://api.derivws.com/trading/v1/options/ws/demo?otp=x` | WS | OTP in URL | Demo trading |
| `wss://api.derivws.com/trading/v1/options/ws/real?otp=x` | WS | OTP in URL | Live trading |
| `wss://api.derivws.com/trading/v1/options/ws/public` | WS | None | Public market data |
