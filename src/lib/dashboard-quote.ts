import "server-only";
import type { QuoteCatalog } from "@/lib/quote";

/**
 * Calls paertner Dashboard's quote API (docs/13-sales-and-payments.md in the app's repository) with the shared
 * QUOTE_API_KEY. Server only: the key never reaches a browser, and the browser only talks to this site.
 */

export class DashboardQuoteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function dashboardUrl() {
  return (process.env.DASHBOARD_URL || "https://app.paertner.com").replace(/\/$/, "");
}

export function quoteConfigured() {
  return Boolean(process.env.QUOTE_API_KEY);
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const key = process.env.QUOTE_API_KEY;
  if (!key) throw new DashboardQuoteError("The quote form is not connected yet.", 503);
  let res: Response;
  try {
    res = await fetch(`${dashboardUrl()}${path}`, {
      ...init,
      cache: "no-store",
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new DashboardQuoteError("We could not reach our booking system. Please try again shortly.", 502);
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new DashboardQuoteError(body?.error || "Something went wrong. Please try again shortly.", res.status);
  return body as T;
}

let cached: { at: number; catalog: QuoteCatalog } | null = null;

/** The published packages; kept for a minute so a busy page does not ask the app on every view. */
export async function getQuoteCatalog(): Promise<QuoteCatalog> {
  if (cached && Date.now() - cached.at < 60_000) return cached.catalog;
  const catalog = await call<QuoteCatalog>("/api/public/catalog");
  cached = { at: Date.now(), catalog };
  return catalog;
}

export function getQuoteSlots(from: string, to: string) {
  return call<{ slots: string[]; slotMinutes: number; timezone: string }>(`/api/public/meeting-slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export function sendQuote(body: unknown) {
  return call<{ number: string; startsAt: string | null }>("/api/public/quote", { method: "POST", body: JSON.stringify(body) }, 20_000);
}
