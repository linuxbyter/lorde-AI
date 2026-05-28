import { NextRequest, NextResponse } from "next/server";

function readCookie(request: NextRequest, name: string): string {
  return request.cookies.get(name)?.value || "";
}

export async function GET(request: NextRequest) {
  const authenticated = readCookie(request, "deriv_authenticated") === "true";

  if (!authenticated) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    token: readCookie(request, "deriv_token"),
    accountId: readCookie(request, "deriv_account"),
    balance: readCookie(request, "deriv_balance") || "0.00",
  });
}
