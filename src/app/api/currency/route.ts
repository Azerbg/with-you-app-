import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates, detectCurrencyFromHeaders, CURRENCY_SYMBOLS, SUPPORTED_CURRENCIES } from "@/lib/currency";

// GET /api/currency — returns current exchange rates + detected currency
export async function GET(req: NextRequest) {
  const rates = await getExchangeRates();
  const acceptLanguage = req.headers.get("accept-language");
  const preferred = req.cookies.get("preferred_currency")?.value;
  const detected = preferred ?? detectCurrencyFromHeaders(acceptLanguage);
  const currency = SUPPORTED_CURRENCIES.includes(detected as never) ? detected : "USD";

  return NextResponse.json({
    currency,
    rates,
    symbols: CURRENCY_SYMBOLS,
    supported: SUPPORTED_CURRENCIES,
  });
}

// POST /api/currency — set preferred currency cookie
export async function POST(req: NextRequest) {
  const { currency } = await req.json();
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  const res = NextResponse.json({ currency });
  res.cookies.set("preferred_currency", currency, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}
