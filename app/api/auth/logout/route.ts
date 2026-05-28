import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://lorde-ai-plum.vercel.app";
  const response = NextResponse.redirect(new URL("/", baseUrl));

  const clearOpts = { maxAge: 0, path: "/" };

  response.cookies.set("deriv_token", "", clearOpts);
  response.cookies.set("deriv_account", "", clearOpts);
  response.cookies.set("deriv_balance", "", clearOpts);
  response.cookies.set("deriv_authenticated", "", clearOpts);
  response.cookies.set("deriv_expires_at", "", clearOpts);
  response.cookies.set("deriv_refresh_token", "", clearOpts);
  response.cookies.set("pkce_verifier", "", clearOpts);
  response.cookies.set("oauth_state", "", clearOpts);

  return response;
}
