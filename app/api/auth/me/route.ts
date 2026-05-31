import { NextRequest, NextResponse } from "next/server";

function readCookie(request: NextRequest, name: string): string {
  return request.cookies.get(name)?.value || "";
}

interface DerivAccount {
  account_id: string;
  balance: number;
  currency: string;
  account_type?: string;
}

export async function GET(request: NextRequest) {
  const authenticated = readCookie(request, "deriv_authenticated") === "true";

  if (!authenticated) {
    return NextResponse.json({ authenticated: false });
  }

  const token = readCookie(request, "deriv_token");
  const clientId = process.env.NEXT_PUBLIC_DERIV_APP_ID;

  let accounts: Array<{
    accountId: string;
    balance: string;
    currency: string;
    type: string;
  }> = [];

  // Step 1: Try live Deriv API to get fresh account data
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

    if (accountsRes.ok) {
      const accountsData = await accountsRes.json();
      if (accountsData.data) {
        let accountsArray: DerivAccount[] = [];
        if (Array.isArray(accountsData.data)) {
          accountsArray = accountsData.data as DerivAccount[];
        } else if (typeof accountsData.data === 'object' && accountsData.data !== null) {
          const obj = accountsData.data as Record<string, any>;
          accountsArray = Object.entries(obj).map(([type, acc]) => ({
            ...(acc as DerivAccount),
            account_type: type
          } as DerivAccount));
        }
        if (accountsArray.length > 0) {
          accounts = accountsArray.map((acc: DerivAccount) => ({
            accountId: acc.account_id,
            balance: String(acc.balance || "0.00"),
            currency: acc.currency || "USD",
            type: acc.account_type || "unknown",
          }));
        }
      }
    } else {
      console.error("[Auth/me] Deriv accounts API returned:", accountsRes.status);
    }
  } catch (err) {
    console.error("[Auth/me] Failed to fetch accounts:", err);
  }

  // Step 2: Fallback to stored accounts cookie (all accounts from login)
  if (accounts.length === 0) {
    const rawAccounts = readCookie(request, "deriv_accounts");
    if (rawAccounts) {
      try {
        const parsed = JSON.parse(rawAccounts);
        if (Array.isArray(parsed)) {
          accounts = parsed.map((acc: any) => ({
            accountId: acc.account_id,
            balance: String(acc.balance || "0.00"),
            currency: acc.currency || "USD",
            type: acc.account_type || "unknown",
          }));
        }
      } catch {}
    }
  }

  // Step 3: Fallback to single account cookie
  if (accounts.length === 0) {
    const cookieAccountId = readCookie(request, "deriv_account");
    const cookieBalance = readCookie(request, "deriv_balance");
    const cookieType = readCookie(request, "deriv_account_type");
    if (cookieAccountId) {
      accounts = [{ 
        accountId: cookieAccountId, 
        balance: cookieBalance || "0.00", 
        currency: "USD", 
        type: cookieType || "unknown" 
      }];
    }
  }

  // Step 4: Ultimate fallback - return demo account so UI works
  if (accounts.length === 0) {
    accounts = [{ 
      accountId: "DEMO_ACCOUNT", 
      balance: "10000.00", 
      currency: "USD", 
      type: "demo" 
    }];
  }

  const selectedAccountId = readCookie(request, "deriv_selected_account") || "";
  const selected = accounts.find(acc => acc.accountId === selectedAccountId) || accounts[0] || null;

  return NextResponse.json({
    authenticated: true,
    accounts,
    selectedAccount: selected ?? { accountId: "", balance: "0.00", currency: "USD", type: "unknown" },
  });
}
