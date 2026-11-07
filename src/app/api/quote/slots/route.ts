import { NextResponse } from "next/server";
import { DashboardQuoteError, getQuoteSlots } from "@/lib/dashboard-quote";

/** Free meeting times for the quote form, from paertner Dashboard (the next weeks, in UTC). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || new Date().toISOString();
  const to = url.searchParams.get("to") || new Date(Date.now() + 45 * 86_400_000).toISOString();
  try {
    return NextResponse.json(await getQuoteSlots(from, to), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const status = e instanceof DashboardQuoteError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Please try again shortly." }, { status: status >= 500 ? 502 : status });
  }
}
