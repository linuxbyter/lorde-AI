import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const acct1 = searchParams.get("acct1");
  const token1 = searchParams.get("token1");
  const balance = searchParams.get("balance");

  if (!acct1 || !token1) {
    return NextResponse.redirect(
      new URL("/dashboard?auth=failed&reason=missing_params", request.url)
    );
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  };

  response.cookies.set("deriv_token", token1, cookieOpts);
  response.cookies.set("deriv_account", acct1, cookieOpts);
  response.cookies.set("deriv_balance", balance || "0", cookieOpts);
  response.cookies.set("deriv_authenticated", "true", cookieOpts);

  return response;
}
