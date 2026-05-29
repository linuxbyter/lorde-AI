import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Expect body: { accountId: string }
  const body = await request.json();
  const { accountId } = body;
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }
  // Store selected account in cookie (httpOnly)
  const cookieStore = await cookies();
  cookieStore.set("deriv_selected_account", accountId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return NextResponse.json({ success: true });
}
