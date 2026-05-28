import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, accountId, botCode, botName } = body;

  if (!token || !accountId) {
    return NextResponse.json(
      { error: "Authentication required. Please connect your Deriv account." },
      { status: 401 }
    );
  }

  if (!botCode) {
    return NextResponse.json(
      { error: "No bot file loaded. Please load a trade file first." },
      { status: 400 }
    );
  }

  const engineUrl = process.env.NEXT_PUBLIC_BOT_ENGINE_URL;

  if (!engineUrl) {
    return NextResponse.json({
      status: "started",
      mode: "local",
      message: `Bot "${botName}" started in local simulation mode. No external engine endpoint configured.`,
      timestamp: new Date().toISOString(),
      accountId,
    });
  }

  try {
    const engineResponse = await fetch(engineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "Deriv-App-ID": process.env.NEXT_PUBLIC_DERIV_APP_ID!,
      },
      body: JSON.stringify({
        token,
        account_id: accountId,
        bot_code: botCode,
        bot_name: botName,
      }),
    });

    if (!engineResponse.ok) {
      const errorText = await engineResponse.text();
      return NextResponse.json(
        { error: `Engine rejected request: ${errorText}` },
        { status: engineResponse.status }
      );
    }

    const data = await engineResponse.json();
    return NextResponse.json({ status: "started", ...data });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to reach bot engine. Running in local simulation mode.",
        status: "fallback_local",
      },
      { status: 200 }
    );
  }
}
