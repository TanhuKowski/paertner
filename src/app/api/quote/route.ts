import { NextResponse } from "next/server";
import { z } from "zod";
import { DashboardQuoteError, sendQuote } from "@/lib/dashboard-quote";

const MAX_BYTES = 40_000;
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80);
const text = (max: number) => z.string().trim().max(max).optional();
const schema = z.object({
  packages: z.array(z.object({ slug, addons: z.array(z.object({ slug, quantity: z.number().int().min(1).max(20) })).max(20) })).max(20),
  custom_plan: z.boolean(),
  business_name: z.string().trim().min(1).max(160),
  website: text(300),
  industry: text(120),
  city: text(120),
  answers: z.array(z.object({ key: z.string().max(60), label: z.string().max(200), value: z.string().max(2000) })).max(40),
  message: text(5000),
  contact_name: z.string().trim().min(2).max(160),
  contact_email: z.email().max(254),
  contact_phone: text(40),
  heard_from: text(200),
  starts_at: z.iso.datetime({ offset: true }),
  consent: z.literal(true),
  company_site: z.string().max(0).optional(),
});

/** Requests per address in the last hour (a second guard next to Cloudflare's rate limit). */
const recent = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= 5) return true;
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
  return false;
}

/**
 * The quote form posts here; this site's server forwards the request to paertner Dashboard, which prices it from the
 * catalog, holds the meeting time and emails the customer. Errors from the app ("That time was just booked, choose
 * another.") are shown on the form as they are.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const self = new URL(req.url).origin;
  if (origin && origin !== self && origin !== process.env.NEXT_PUBLIC_SERVER_URL && origin !== `https://${req.headers.get("host")}`)
    return NextResponse.json({ error: "Please send this form from the Paertner website." }, { status: 403 });
  if (Number(req.headers.get("content-length") || 0) > MAX_BYTES) return NextResponse.json({ error: "Your request is too long." }, { status: 413 });
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
  if (tooMany(ip)) return NextResponse.json({ error: "We already have your recent requests. Please wait a little before sending another." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the form: your business name, your name, a valid email, a meeting time, and the privacy notice." }, { status: 400 });
  const { company_site, ...data } = parsed.data;
  if (company_site) return NextResponse.json({ number: "PQ-0", startsAt: data.starts_at }, { status: 201 });
  if (!data.packages.length && !data.custom_plan) return NextResponse.json({ error: "Choose a package or Custom plan." }, { status: 400 });

  try {
    const result = await sendQuote({ ...data, source_page: req.headers.get("referer")?.slice(0, 500) || "https://paertner.com/quote" });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const status = e instanceof DashboardQuoteError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Your request could not be sent. Please try again." }, { status: status === 409 ? 409 : status >= 500 ? 502 : 400 });
  }
}
