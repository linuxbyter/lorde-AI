import { NextRequest, NextResponse } from "next/server";

function readCookie(request: NextRequest, name: string): string {
  return request.cookies.get(name)?.value || "";
}

interface DerivAccount {
  account_id: string;
  balance: number;
  currency: string;
  account_type?: string;
  group?: string;
  status?: string;
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

  // Step 1: Try live Deriv API
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
      console.log("[Auth/me] API response:", JSON.stringify(accountsData).substring(0, 500));

      if (accountsData.data) {
        let accountsArray: DerivAccount[] = [];

        if (Array.isArray(accountsData.data)) {
          // Array format: [{ account_id, balance, ... }]
          accountsArray = accountsData.data;
        } else if (typeof accountsData.data === "object" && accountsData.data !== null) {
          // Object format: { demo: { account_id, ... }, real: { account_id, ... } }
          // OR single account: { account_id, balance, ... }
          const obj = accountsData.data as Record<string, any>;
          const keys = Object.keys(obj);

          // Check if it looks like a single account (has account_id directly)
          if (obj.account_id) {
            accountsArray = [obj as DerivAccount];
          } else {
            // It's a dict of accounts keyed by type or account_id
            accountsArray = keys.map((key) => {
              const acc = obj[key] as DerivAccount;
              return {
                ...acc,
                account_type: acc.account_type || key,
              } as DerivAccount;
            });
          }
        }

        if (accountsArray.length > 0) {
          accounts = accountsArray.map((acc: DerivAccount) => ({
            accountId: acc.account_id,
            balance: String(acc.balance || "0.00"),
            currency: acc.currency || "USD",
            type: acc.account_type || "unknown",
          }));
          console.log("[Auth/me] Parsed accounts:", accounts.map(a => a.accountId + "(" + a.type + ")").join(", "));
        }
      }
    } else {
      console.error("[Auth/me] Deriv API error:", accountsRes.status);
    }
  } catch (err) {
    console.error("[Auth/me] Deriv API fetch failed:", err);
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
          console.log("[Auth/me] Fallback from cookie:", accounts.map(a => a.accountId + "(" + a.type + ")").join(", "));
        }
      } catch (e) {
        console.error("[Auth/me] Failed to parse deriv_accounts cookie:", e);
      }
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

  // Step 4: Ultimate fallback
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
