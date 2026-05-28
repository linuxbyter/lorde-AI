# Lorde Core Bot Terminal — Architecture & Issue Analysis

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                  │
│  Landing Page (/) ──> Dashboard (/dashboard)                     │
│                            │                                     │
│  ┌─────────────┐  ┌───────┴────────┐  ┌──────────────────┐     │
│  │ AuthStatus   │  │ LoadBotButton  │  │ RunBotButton      │     │
│  │ (useAuth)    │  │ (file upload)  │  │ (auth gate + run) │     │
│  └──────┬──────┘  └───────┬────────┘  └────────┬─────────┘     │
│         │                 │                     │                │
│  ┌──────┴─────────────────┴─────────────────────┴──────────┐    │
│  │              BotStateProvider (Context)                   │    │
│  │  bot | isRunning | logs | setBot | startBot | stopBot   │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                              │                                   │
│  ┌──────────────────────────┴──────────────────────────────┐    │
│  │                   ConsoleLog                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────────┘
                           │ fetch() calls
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SERVER (Next.js API)                         │
│                                                                  │
│  /api/auth/deriv   → Generate PKCE → Redirect to auth.deriv.com │
│  /api/auth/callback → Verify state → Exchange code → Set cookies │
│  /api/auth/me      → Read cookies → Return auth status           │
│  /api/auth/logout  → Clear cookies → Redirect to /               │
│  /api/bot/run      → Forward to Render engine                    │
│  /api/bot/balance  → Fetch balance from Deriv API                │
└──────────┬────────────────────────────┬──────────────────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────┐    ┌─────────────────────────────────────┐
│   Deriv OAuth API    │    │        Deriv REST API               │
│ auth.deriv.com       │    │ api.derivws.com                      │
│  /oauth2/auth        │    │  /trading/v1/options/accounts        │
│  /oauth2/token       │    │  /trading/v1/options/accounts/{id}/otp│
└─────────────────────┘    └─────────────────────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │   Render Engine      │
                           │ lorde-ai.onrender.com│
                           │ /api/v1/trade/direct │
                           │ (WebSocket via OTP)  │
                           └─────────────────────┘
```

---

## Issues Found (Ranked by Severity)

### CRITICAL — Will Break Auth Flow

| # | File | Issue | Impact |
|---|------|-------|--------|
| 1 | `app/api/auth/callback/route.ts:86` | Account fetch missing `Deriv-App-ID` header | Deriv API returns 401. Account ID and balance stay empty. User appears "connected" but has no account info. |
| 2 | `app/api/bot/balance/route.ts:16` | Uses wrong API domain (`api.deriv.com` instead of `api.derivws.com`), never sends auth token in header | Balance endpoint completely broken. Never returns real balance. |
| 3 | `app/api/auth/callback/route.ts` | No `Deriv-App-ID` header on token exchange POST | Token exchange may fail depending on Deriv's validation. |

### HIGH — Broken Functionality

| # | File | Issue | Impact |
|---|------|-------|--------|
| 4 | No file | No token refresh mechanism | Access tokens expire in 3600s. User must re-login every hour. No silent refresh. |
| 5 | `components/RunBotButton.tsx:23-27` | Stop bot is client-side only | Bot keeps running on Render engine even after user clicks "Stop". Trades continue executing. |
| 6 | No file | Balance never updates after initial login | `deriv_balance` cookie set once at login, never refreshed. Dashboard shows stale balance. |

### MEDIUM — Security & Quality

| # | File | Issue | Impact |
|---|------|-------|--------|
| 7 | `app/api/auth/me/route.ts:16` | Exposes raw OAuth token to client | XSS attack would steal Deriv trading token. |
| 8 | `middleware.ts` | No-op middleware | No route protection. Dashboard accessible without auth (client-side check only). |
| 9 | `app/api/bot/run/route.ts` | No `Deriv-App-ID` header forwarded to engine | Engine may reject requests. |

### LOW — Nice to Have

| # | File | Issue | Impact |
|---|------|-------|--------|
| 10 | `components/LoadBotButton.tsx` | Accepts `.py` files but engine likely only runs JS | User uploads Python bot, nothing happens. |
| 11 | `lib/botStore.tsx` | New array reference on every addLog | Unnecessary re-renders in high-frequency logging. |
| 12 | `package.json` | `cookie` and `js-cookie` unused | Dead dependencies. |

---

## What's Actually Happening When You Click "Connect"

1. Browser hits `GET /api/auth/deriv`
2. Server generates PKCE verifier + challenge + state, stores in cookies
3. Server redirects to `https://auth.deriv.com/oauth2/auth?response_type=code&client_id=33owq0MRuV9ahlgyDTUS7&...`
4. **If the redirect URL in Deriv panel doesn't match exactly** → Deriv shows error page
5. **If it matches** → User logs in on Deriv
6. Deriv redirects back to `https://lorde-ai-plum.vercel.app/api/auth/callback?code=...&state=...`
7. Server validates state, exchanges code for token via POST to `https://auth.deriv.com/oauth2/token`
8. **THIS IS WHERE IT LIKELY FAILS**: Server fetches accounts from `https://api.derivws.com/trading/v1/options/accounts` WITHOUT the required `Deriv-App-ID` header → 401 error → accountId stays empty
9. Cookies are set (token works, but accountId is empty)
10. Redirect to `/dashboard` → User sees "connected" but with empty account ID and $0.00 balance

---

## Fix Plan (Ship Tonight)

### Fix 1: Add `Deriv-App-ID` header to ALL Deriv API calls
- Callback account fetch
- Balance endpoint
- Bot engine forwarding

### Fix 2: Fix the balance endpoint to use correct API
- Change domain from `api.deriv.com` to `api.derivws.com`
- Add proper auth headers

### Fix 3: Add token refresh flow
- Store `expires_at` timestamp in cookie
- On `/api/auth/me`, check if token is near expiry
- Auto-refresh using the token endpoint (if refresh_token is available)
- If no refresh_token, redirect to re-auth

### Fix 4: Server-side bot stop
- Add `POST /api/bot/stop` endpoint
- Forward stop command to Render engine

### Fix 5: Balance polling
- Add client-side interval to fetch balance every 30s
- Update dashboard in real-time

---

## Deriv API Requirements (From Docs)

### Every REST call needs these headers:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Deriv-App-ID: YOUR_APP_ID
Content-Type: application/json
```

### Endpoints:
| Endpoint | Method | Scope | Purpose |
|----------|--------|-------|---------|
| `https://api.derivws.com/trading/v1/options/accounts` | GET | `trade` | Get all accounts |
| `https://api.derivws.com/trading/v1/options/accounts/{accountId}/otp` | POST | `trade` | Get WebSocket URL |
| `wss://api.derivws.com/trading/v1/options/ws/demo?otp=xxx` | WS | — | Demo trading |
| `wss://api.derivws.com/trading/v1/options/ws/real?otp=xxx` | WS | — | Live trading |

### OAuth Endpoints:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://auth.deriv.com/oauth2/auth` | GET (redirect) | Authorization |
| `https://auth.deriv.com/oauth2/token` | POST | Token exchange |

### Required OAuth Params:
- `response_type=code`
- `client_id={APP_ID}`
- `redirect_uri={exactly matches registered URL}`
- `scope=trade account_manage`
- `state={random}`
- `code_challenge={BASE64URL(SHA256(code_verifier))}`
- `code_challenge_method=S256`
