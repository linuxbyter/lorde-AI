import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://lorde-ai-plum.vercel.app";
  const clientId = process.env.NEXT_PUBLIC_DERIV_APP_ID;

  console.log("[Auth Callback] Received from Deriv:", Object.fromEntries(searchParams.entries()));

  if (error) {
    console.error("[Auth Callback] Deriv error:", error, errorDesc);
    return NextResponse.redirect(
      new URL(`/dashboard?auth=failed&reason=${encodeURIComponent(error)}`, baseUrl)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("pkce_verifier")?.value;

  console.log("[Auth Callback] State match:", state === storedState, "Verifier present:", !!codeVerifier);

  if (!state || state !== storedState) {
    console.error("[Auth Callback] State mismatch");
    return NextResponse.redirect(
      new URL("/dashboard?auth=failed&reason=state_mismatch", baseUrl)
    );
  }

  if (!code || !codeVerifier) {
    console.error("[Auth Callback] Missing code or verifier");
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
    console.log("[Auth Callback] Token response:", tokenData.access_token ? "OK" : "FAILED", tokenData.error || "");

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

  // Step 2: Fetch account info with BOTH required headers
  let accountId = "";
  let balance = "0.00";
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
    console.log("[Auth Callback] Accounts:", JSON.stringify(accountsData).substring(0, 300));

    if (accountsData.data && accountsData.data.length > 0) {
      accountId = accountsData.data[0].account_id;
      balance = String(accountsData.data[0].balance || "0.00");
    }
  } catch (err) {
    console.error("[Auth Callback] Account fetch failed:", err);
  }

  console.log("[Auth Callback] Account:", accountId, "Balance:", balance);

  // Step 3: Set session cookies
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
  response.cookies.set("deriv_authenticated", "true", cookieOpts);
  response.cookies.set("deriv_expires_at", String(expiresAt), cookieOpts);

  if (tokenData.refresh_token) {
    response.cookies.set("deriv_refresh_token", tokenData.refresh_token, {
      ...cookieOpts,
      maxAge: 30 * 24 * 60 * 60, // 30 days for refresh token
    });
  }

  // Clear PKCE cookies
  response.cookies.set("pkce_verifier", "", { maxAge: 0, path: "/" });
  response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}
