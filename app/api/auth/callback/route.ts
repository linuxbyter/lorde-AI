import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const acct1 = searchParams.get("acct1");
  const token1 = searchParams.get("token1");
  const balance = searchParams.get("balance");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (!acct1 || !token1) {
    return NextResponse.redirect(
      new URL("/dashboard?auth=failed&reason=missing_params", baseUrl)
    );
  }

  const response = NextResponse.redirect(new URL("/dashboard", baseUrl));

  // Set secure cookies for Deriv session
  response.cookies.set("deriv_token", token1, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  response.cookies.set("deriv_account", acct1, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  response.cookies.set("deriv_balance", balance || "0", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  response.cookies.set("deriv_authenticated", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
