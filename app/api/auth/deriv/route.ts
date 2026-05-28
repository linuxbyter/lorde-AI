import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '33owq0MRuV9ahlgyDTUS7';
  
  // Dynamically extract the exact Codespace or live address hosting your frontend
  const host = request.headers.get('host') || 'scaling-tribble-g4pgv5r9wwqv3w6j9.github.dev';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  
  // This MUST match the Redirect URL you registered in the Deriv Developer Console exactly!
  const redirectUri = `${protocol}://${host}/api/auth/callback`;

  // Explicitly build the query matching Deriv's expected format
  const targetOAuthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  console.log(`[OAuth Kickoff] Routing client to: ${targetOAuthUrl}`);
  
  return NextResponse.redirect(targetOAuthUrl);
}
