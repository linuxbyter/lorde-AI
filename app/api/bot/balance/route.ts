import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, accountId } = body;

  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Fetch balance from Deriv API
  try {
    const response = await fetch("https://api.deriv.com/api/v1/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        balance: 1,
        account_id: accountId,
        req_id: 1,
      }),
    });

    const data = await response.json();
    return NextResponse.json({ balance: data.balance?.balance || "0.00" });
  } catch {
    return NextResponse.json({ balance: "0.00" });
  }
}
