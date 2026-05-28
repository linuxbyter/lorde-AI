import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function readCookie(request: NextRequest, name: string): string {
  return request.cookies.get(name)?.value || "";
}

export async function GET(request: NextRequest) {
  const authenticated = readCookie(request, "deriv_authenticated") === "true";

  if (!authenticated) {
    return NextResponse.json({ authenticated: false });
  }

  const token = readCookie(request, "deriv_token");
  const accountId = readCookie(request, "deriv_account");
  const balance = readCookie(request, "deriv_balance") || "0.00";
  const expiresAt = Number(readCookie(request, "deriv_expires_at") || "0");
  const refreshToken = readCookie(request, "deriv_refresh_token");

  // Check if token is expired or about to expire (within 5 minutes)
  const now = Date.now();
  const isExpired = expiresAt > 0 && now >= expiresAt - 5 * 60 * 1000;

  if (isExpired && refreshToken) {
    // Try to refresh the token
    const clientId = process.env.NEXT_PUBLIC_DERIV_APP_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://lorde-ai-plum.vercel.app";

    try {
      const tokenRes = await fetch("https://auth.deriv.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId!,
          refresh_token: refreshToken,
        }).toString(),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.access_token) {
        const newExpiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

        // Set new cookies (we can't set httpOnly cookies from a GET response
        // that the client will read, but we can return the new token info)
        return NextResponse.json({
          authenticated: true,
          token: tokenData.access_token,
          accountId,
          balance,
          refreshed: true,
          expiresAt: newExpiresAt,
        });
      }
    } catch {
      // Refresh failed, user needs to re-auth
    }
  }

  return NextResponse.json({
    authenticated: true,
    token,
    accountId,
    balance,
    expiresAt,
  });
}
