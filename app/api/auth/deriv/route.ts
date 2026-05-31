import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function base64url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  // RFC 7636 requires 43-128 chars from [A-Z a-z 0-9 - . _ ~]
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = crypto.randomBytes(64);
  return Array.from(array)
    .map(v => chars[v % chars.length])
    .join('');
}

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_DERIV_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_DERIV_APP_ID is not configured" },
      { status: 500 }
    );
  }

  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  // Generate PKCE
  const codeVerifier = generateCodeVerifier();
  const challengeHash = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64url(challengeHash);

  // Encode verifier inside state so it survives cross-site redirects
  const stateRandom = base64url(crypto.randomBytes(16));
  const state = base64url(Buffer.from(stateRandom + ":" + codeVerifier));

  const redirectUri = `${baseUrl}/api/auth/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "trade account_manage",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  // Create redirect response first, then set cookies on it
  const response = NextResponse.redirect(
    `https://auth.deriv.com/oauth2/auth?${params.toString()}`
  );

  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
