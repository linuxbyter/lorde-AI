import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || "33owq0MRuV9ahlgyDTUS7";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://lorde-ai-plum.vercel.app";

  const redirectUri = `${baseUrl}/api/auth/callback`;

  const derivAuthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(derivAuthUrl);
}
