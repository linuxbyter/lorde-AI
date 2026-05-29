import { NextRequest, NextResponse } from "next/server";

function readCookie(request: NextRequest, name: string): string {
  return request.cookies.get(name)?.value || "";
}

interface DerivAccount {
  account_id: string;
  balance: number;
  currency: string;
  account_type?: string; // "demo" or "real"
}

export async function GET(request: NextRequest) {
  const authenticated = readCookie(request, "deriv_authenticated") === "true";

  if (!authenticated) {
    return NextResponse.json({ authenticated: false });
  }

  const token = readCookie(request, "deriv_token");
  const clientId = process.env.NEXT_PUBLIC_DERIV_APP_ID;

  // Fetch all accounts
  let accounts: Array<{
    accountId: string;
    balance: string;
    currency: string;
    type: string;
  }> = [];
  try {
    const accountsRes = await fetch(
      "https://api.derivws.com/trading/v1/options/accounts",
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Deriv-App-ID": clientId!,
          "Content-Type": "application/json",
        },
      }
    );
    const accountsData = await accountsRes.json();
    if (accountsData.data && Array.isArray(accountsData.data)) {
      accounts = (accountsData.data as DerivAccount[]).map((acc: DerivAccount) => ({
        accountId: acc.account_id,
        balance: String(acc.balance || "0.00"),
        currency: acc.currency || "USD",
        type: acc.account_type || "unknown",
      }));
    }
  } catch (err) {
    console.error("[Auth/me] Failed to fetch accounts:", err);
    // fallback to empty
  }

  // Determine selected account from cookie
  const selectedAccountId = readCookie(request, "deriv_selected_account") || "";
  // If no selected account cookie, default to first account if exists
  const selected = accounts.find(acc => acc.accountId === selectedAccountId) || accounts[0] || null;

  return NextResponse.json({
    authenticated: true,
    token,
    accounts,
    selectedAccount: selected ?? { accountId: "", balance: "0.00", currency: "USD", type: "unknown" },
  });
}
