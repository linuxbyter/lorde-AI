import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://lorde-ai-plum.vercel.app";
  const clientId = process.env.NEXT_PUBLIC_DERIV_APP_ID;

  if (error) {
    console.error("[Auth Callback] Deriv error:", error, errorDesc);
    return NextResponse.redirect(
      new URL(`/dashboard?auth=failed&reason=${encodeURIComponent(error)}`, baseUrl)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;

  // Decode verifier from state param (embedded as stateRandom:codeVerifier)
  let codeVerifier = "";
  try {
    const decoded = base64urlDecode(state || "");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx > 0) {
      codeVerifier = decoded.slice(colonIdx + 1);
    }
  } catch (e) {
    console.error("[Auth Callback] Failed to decode state:", e);
  }

  if (!state || !storedState) {
    console.error("[Auth Callback] Missing state or stored state", { state: !!state, storedState: !!storedState });
    return NextResponse.redirect(
      new URL("/dashboard?auth=failed&reason=missing_state", baseUrl)
    );
  }

  if (state !== storedState) {
    console.error("[Auth Callback] State mismatch", { received: state?.substring(0, 20), stored: storedState?.substring(0, 20) });
    return NextResponse.redirect(
      new URL("/dashboard?auth=failed&reason=state_mismatch", baseUrl)
    );
  }

  if (!code || !codeVerifier) {
    console.error("[Auth Callback] Missing code or verifier", { code: !!code, verifier: !!codeVerifier });
    return NextResponse.redirect(
      new URL("/dashboard?auth=failed&reason=missing_code", baseUrl)
    );
  }

  const redirectUri = `${baseUrl}/api/auth/callback`;

  // Step 1: Exchange code for token
  let tokenData: { access_token?: string; expires_in?: number; refresh_token?: string; error?: string };
  try {
    const tokenRes = await fetch("https://auth.deriv.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId!,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }).toString(),
    });

    tokenData = await tokenRes.json();
    console.log("[Auth Callback] Token response:", JSON.stringify(tokenData).substring(0, 200));

    if (!tokenData.access_token) {
      console.error("[Auth Callback] No access_token:", tokenData);
      return NextResponse.redirect(
        new URL(`/dashboard?auth=failed&reason=${encodeURIComponent(tokenData.error || "token_exchange_failed")}`, baseUrl)
      );
    }
  } catch (err) {
    console.error("[Auth Callback] Token exchange network error:", err);
    return NextResponse.redirect(
      new URL("/dashboard?auth=failed&reason=network_error", baseUrl)
    );
  }

  // Step 2: Fetch all accounts (demo + real)
  let accountId = "";
  let balance = "0.00";
  let accountType = "unknown";
  let rawAccounts: string = "[]";
  try {
    const accountsRes = await fetch(
      "https://api.derivws.com/trading/v1/options/accounts",
      {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Deriv-App-ID": clientId!,
          "Content-Type": "application/json",
        },
      }
    );
    const accountsData = await accountsRes.json();
    console.log("[Auth Callback] Accounts response:", JSON.stringify(accountsData).substring(0, 500));

    if (accountsData.data) {
      let accountsArray = [];
      if (Array.isArray(accountsData.data)) {
        accountsArray = accountsData.data;
      } else if (typeof accountsData.data === "object") {
        // Object format like { demo: {...}, real: {...} }
        accountsArray = Object.entries(accountsData.data).map(([type, acc]: [string, any]) => ({
          ...acc,
          account_type: acc.account_type || type,
        }));
      }

      if (accountsArray.length > 0) {
        rawAccounts = JSON.stringify(accountsArray);
        // Pick first account as default
        accountId = accountsArray[0].account_id;
        balance = String(accountsArray[0].balance || "0.00");
        accountType = accountsArray[0].account_type || "unknown";
        console.log("[Auth Callback] Found", accountsArray.length, "accounts:", accountsArray.map((a: any) => a.account_id + "(" + a.account_type + ")").join(", "));
      }
    }
  } catch (err) {
    console.error("[Auth Callback] Account fetch failed:", err);
  }

  console.log("[Auth Callback] Default account:", accountId, "Balance:", balance, "Type:", accountType);

  // Step 3: Set session cookies ON the response object
  const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;
  const response = NextResponse.redirect(new URL("/dashboard", baseUrl));

  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    maxAge: tokenData.expires_in || 3600,
    path: "/",
  };

  response.cookies.set("deriv_token", tokenData.access_token!, cookieOpts);
  response.cookies.set("deriv_account", accountId, cookieOpts);
  response.cookies.set("deriv_balance", balance, cookieOpts);
  response.cookies.set("deriv_account_type", accountType, cookieOpts);
  response.cookies.set("deriv_authenticated", "true", cookieOpts);
  response.cookies.set("deriv_expires_at", String(expiresAt), cookieOpts);
  response.cookies.set("deriv_accounts", rawAccounts, { ...cookieOpts, maxAge: 24 * 60 * 60 });

  if (tokenData.refresh_token) {
    response.cookies.set("deriv_refresh_token", tokenData.refresh_token, {
      ...cookieOpts,
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  // Clear PKCE cookies
  response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}
