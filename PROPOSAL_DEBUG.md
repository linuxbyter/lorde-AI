# Deriv Proposal Debug — For Claude Review

## The Problem

Bot connects to Deriv Options Trading WebSocket, subscribes to ticks and balance successfully, but when it sends a `proposal` request to get a price quote, the WebSocket closes immediately with code **1009** and no proposal response is ever received.

## What Works

```
✅ WebSocket connects (OTP-based auth via URL)
✅ Balance subscription works → receives $10000 USD
✅ Tick subscription works → receives real-time price data
✅ Bot calculates indicators (BB + RSI) correctly
✅ Bot detects signals and attempts to request proposal
❌ Proposal request → WebSocket closes with code 1009
❌ No trade ever executes
```

## What We're Sending (Proposal Request)

When the bot detects a signal, it sends this over the WebSocket:

```json
{
  "proposal": 1,
  "amount": 15,
  "basis": "stake",
  "contract_type": "PUT",
  "currency": "USD",
  "duration": 60,
  "duration_unit": "s",
  "underlying_symbol": "R_100",
  "req_id": 3
}
```

**Result:** WebSocket closes immediately with code 1009. No error message, no proposal response.

## Official JSON Schema (from Deriv)

The official schema at `https://developers.deriv.me/schemas/proposal_request.schema.json`:

```json
{
  "required": ["proposal", "contract_type", "currency", "underlying_symbol"],
  "additionalProperties": false,
  "auth_required": 0,
  "properties": {
    "proposal": { "type": "integer", "enum": [1] },
    "amount": { "type": "number", "minimum": 0 },
    "basis": { "type": "string", "enum": ["payout", "stake"] },
    "contract_type": { "type": "string", "enum": ["HIGHER","LOWER","CALL","PUT",...] },
    "currency": { "type": "string", "pattern": "^[a-zA-Z0-9]{2,20}$" },
    "duration": { "type": "integer", "minimum": 0, "maximum": 99999999 },
    "duration_unit": { "type": "string", "enum": ["d","m","s","h","t"] },
    "underlying_symbol": { "type": "string", "pattern": "^\\w{2,30}$" },
    "subscribe": { "type": "integer", "enum": [1] },
    "req_id": { "type": "integer" }
  }
}
```

### Our Request vs Schema Validation

| Field | Required | Our Value | Schema Valid? |
|-------|----------|-----------|---------------|
| `proposal` | ✅ Required | `1` | ✅ Yes |
| `contract_type` | ✅ Required | `"PUT"` | ✅ In enum list |
| `currency` | ✅ Required | `"USD"` | ✅ Matches pattern |
| `underlying_symbol` | ✅ Required | `"R_100"` | ✅ Matches pattern |
| `amount` | Optional | `15` | ✅ number, min 0 |
| `basis` | Optional | `"stake"` | ✅ In enum list |
| `duration` | Optional | `60` | ✅ integer, in range |
| `duration_unit` | Optional | `"s"` | ✅ In enum list |
| `req_id` | Optional | `3` | ✅ integer |

**All fields are valid per schema. No extra fields sent (`additionalProperties: false`).**

## Key Discovery: `auth_required: 0`

The schema says `"auth_required": 0`. This suggests the proposal endpoint doesn't require authentication at the message level. But the docs say "Trading endpoints require authentication."

This is contradictory. The OTP in the WebSocket URL provides auth at connection level, but maybe there's an additional step needed?

## WebSocket Close Code 1009

Code 1009 = "Message Too Big" in RFC 6455, but our message is ~200 bytes. Deriv may use this code for "Policy Violation" or "Not Authorized for this operation."

## What the Python Deriv API Library Does

From `@deriv/deriv-api` npm package and `python-deriv-api`:

```javascript
// Official Deriv API library usage
const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPI');

const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
const api = new DerivAPI({ connection });

// Step 1: Authorize with token
const authorize = await api.authorize('YOUR_API_TOKEN');
console.log(authorize);

// Step 2: Then do trading operations
const proposal = await api.proposal({ proposal: 1, ... });
```

**Critical observation:** The official library sends an `authorize` call BEFORE any trading operations, even though the WebSocket is already connected.

## Two Different WebSocket APIs

There are TWO different Deriv WebSocket APIs:

| API | Endpoint | Auth Method |
|-----|----------|-------------|
| **Legacy** (Binary.com) | `wss://ws.derivws.com/websockets/v3?app_id=XXX` | `authorize` message with token |
| **Options Trading** (New) | `wss://api.derivws.com/trading/v1/options/ws/demo?otp=XXX` | OTP in URL |

We're using the **Options Trading** API with OTP auth. But maybe it still needs an `authorize` message?

## The Bot Code (Relevant Parts)

```javascript
// Getting OTP
async function getOtp() {
  var otpRes = await fetch("https://api.derivws.com/trading/v1/options/accounts/" + accountId + "/otp", {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Deriv-App-ID": appId, "Content-Type": "application/json" },
  });
  var otpData = await otpRes.json();
  return otpData.data.url;  // wss://api.derivws.com/trading/v1/options/ws/demo?otp=xxx
}

// Connecting
var ws = new WebSocket(wsUrl);

ws.on("open", function() {
  // Subscribe to balance and ticks
  ws.send(JSON.stringify({ balance: 1, subscribe: 1, req_id: 1 }));
  ws.send(JSON.stringify({ ticks: "R_100", subscribe: 1, req_id: 2 }));
});

// Sending proposal
function requestProposal(ws, requestId, signal, stake) {
  var reqId = requestId.value++;
  var proposalPayload = {
    proposal: 1,
    amount: stake,
    basis: "stake",
    contract_type: signal,  // "PUT" or "CALL"
    currency: "USD",
    duration: 60,
    duration_unit: "s",
    underlying_symbol: "R_100",
    req_id: reqId,
  };
  ws.send(JSON.stringify(proposalPayload));  // WebSocket closes here with 1009
}
```

## What We Need Help With

1. **Why does the WebSocket close with 1009 when we send a proposal?**
   - Our request matches the JSON schema perfectly
   - No extra fields, all values valid

2. **Do we need to send an `authorize` message after connecting?**
   - The official library does this
   - But our OTP-based auth should already authenticate us
   - What format would the authorize message take for the Options Trading API?

3. **Is there a different endpoint we should be using?**
   - We're using `wss://api.derivws.com/trading/v1/options/ws/demo?otp=XXX`
   - Should we use the legacy `wss://ws.derivws.com/websockets/v3?app_id=XXX` instead?

4. **Does the currency need to match the account's payout_currencies?**
   - We hardcode `"USD"` but maybe the account has a different currency
   - Should we get currency from the balance response?

5. **Is there a minimum amount for PUT/CALL contracts on R_100?**
   - We're staking $15

## Timeline

```
T+0s   WebSocket connects to OTP URL
T+0s   Bot sends: { balance: 1, subscribe: 1, req_id: 1 }
T+0s   Bot sends: { ticks: "R_100", subscribe: 1, req_id: 2 }
T+0s   Server responds: { balance: { balance: 10000, currency: "USD" } }
T+0s   Server starts streaming tick data
T+30s  Bot has enough ticks (25+) for indicator calculation
T+30s  Bot detects signal, sends proposal request
T+30s  WebSocket closes with code 1009
T+31s  Bot reconnects, starts over
```

## Deriv API Endpoints Used

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/trading/v1/options/accounts` | GET | List all accounts | ✅ Works |
| `/trading/v1/options/accounts/{id}/otp` | POST | Get WebSocket URL | ✅ Works |
| WebSocket: `balance` | WS | Get account balance | ✅ Works |
| WebSocket: `ticks` | WS | Subscribe to market data | ✅ Works |
| WebSocket: `proposal` | WS | Get price proposal | ❌ Fails (1009) |
| WebSocket: `buy` | WS | Buy contract | ❌ Never reached |

## Environment

- **Runtime:** Node.js (Next.js 14 server-side)
- **WebSocket library:** `ws` npm package v8.21.0
- **Account:** DOT92305340 (demo)
- **App ID:** 33owq0MRuV9ahlgyDTUS7
- **Token:** OAuth Bearer token (used to get OTP, not sent over WebSocket)
