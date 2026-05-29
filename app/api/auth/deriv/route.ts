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
  const array = crypto.randomBytes(32);
  return Array.from(array)
    .map(v => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])
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

  // Encode verifier inside state so it survives cross-site redirects (mobile fix)
  const stateRandom = base64url(crypto.randomBytes(16));
  const state = base64url(Buffer.from(stateRandom + ":" + codeVerifier));

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

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

  return NextResponse.redirect(
    `https://auth.deriv.com/oauth2/auth?${params.toString()}`
  );
}
