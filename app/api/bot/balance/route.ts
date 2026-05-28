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

  const clientId = process.env.NEXT_PUBLIC_DERIV_APP_ID;

  try {
    const response = await fetch(
      "https://api.derivws.com/trading/v1/options/accounts",
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Deriv-App-ID": clientId!,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const account = accountId
        ? data.data.find((a: { account_id: string }) => a.account_id === accountId)
        : data.data[0];

      if (account) {
        return NextResponse.json({
          balance: String(account.balance || "0.00"),
          currency: account.currency || "USD",
        });
      }
    }

    return NextResponse.json({ balance: "0.00", currency: "USD" });
  } catch {
    return NextResponse.json({ balance: "0.00", currency: "USD" });
  }
}
