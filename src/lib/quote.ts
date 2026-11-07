/**
 * The quote form (/quote): what the visitor can choose, the questions each group asks, and the estimate. The packages
 * and prices live in paertner Dashboard (Sales → Packages); this site reads them through the app's API on the server.
 * Plain module: the form component and the server routes both use it.
 */

export type Billing = "one_time" | "monthly" | "project";

export type QuoteAddon = {
  slug: string;
  name: string;
  billing: Exclude<Billing, "project">;
  priceCents: number;
  priceText: string;
  unit: string | null;
  allowQuantity: boolean;
  note: string | null;
};

export type QuotePackage = {
  slug: string;
  name: string;
  billing: Billing;
  priceCents: number | null;
  priceFrom: boolean;
  priceText: string;
  priceNote: string | null;
  compareNote: string | null;
  gain: string | null;
  details: { label: string; text: string }[];
  featured: boolean;
  addons: QuoteAddon[];
};

export type QuoteGroup = { slug: string; name: string; eyebrow: string | null; description: string | null; packages: QuotePackage[] };
export type QuoteCatalog = { groups: QuoteGroup[]; terms: string; slotMinutes: number; timezone: string };

/** What the visitor chose: package slug to the add-ons (slug to quantity). */
export type Choice = Record<string, Record<string, number>>;

export type Question =
  | { key: string; label: string; kind: "text" | "url"; placeholder?: string }
  | { key: string; label: string; kind: "textarea"; placeholder?: string }
  | { key: string; label: string; kind: "select"; options: string[] }
  | { key: string; label: string; kind: "chips"; options: string[] };

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube"];

const SOCIAL: Question[] = [
  { key: "platforms", label: "Where do you post today?", kind: "chips", options: [...PLATFORMS, "Nowhere yet"] },
  { key: "posting", label: "How often do you post now?", kind: "select", options: ["Not yet", "A few times a month", "About weekly", "Several times a week"] },
];
const SEO: Question[] = [
  { key: "locations", label: "How many locations do you serve from?", kind: "select", options: ["1", "2", "3", "4 or more"] },
  { key: "gbp", label: "Google Business Profile link", kind: "url", placeholder: "https://maps.google.com/..." },
];

/** The extra questions of each group; Monthly Plans cover social and search. */
export const GROUP_QUESTIONS: Record<string, Question[]> = {
  "shoot-day": [
    { key: "shoot_location", label: "Where would we film?", kind: "text", placeholder: "Address or area, in the DMV or elsewhere" },
    { key: "shoot_weeks", label: "Which weeks suit you?", kind: "text", placeholder: "Early December, any weekday" },
  ],
  "monthly-plans": [...SOCIAL, ...SEO],
  "social-media": SOCIAL,
  seo: SEO,
  "crm-automation": [{ key: "crm", label: "Which CRM do you use today?", kind: "select", options: ["None yet", "HubSpot", "GoHighLevel", "Monday", "Houzz", "Another one"] }],
  "paid-ads": [
    { key: "ad_platforms", label: "Where do you want to advertise?", kind: "chips", options: ["Google", "Meta", "TikTok", "Not sure yet"] },
    { key: "ad_budget", label: "Monthly ad budget", kind: "select", options: ["Under $1,000", "$1,000 to $5,000", "$5,000 to $10,000", "Over $10,000", "Not sure yet"] },
  ],
  websites: [
    { key: "pages", label: "How many pages do you need?", kind: "select", options: ["Up to 8", "9 to 15", "More than 15", "Not sure yet"] },
    { key: "launch", label: "When should it launch?", kind: "text", placeholder: "By March, or no fixed date" },
  ],
  "care-plan": [{ key: "hosting", label: "Where is your website hosted?", kind: "text", placeholder: "GoDaddy, Hostinger, WP Engine..." }],
  "custom-software": [{ key: "process", label: "Which process should the tool fix?", kind: "textarea", placeholder: "What your team does today, where it slows down" }],
};

export const CUSTOM_QUESTIONS: Question[] = [{ key: "goal", label: "What do you want to achieve?", kind: "textarea", placeholder: "The result you are after, and anything you have already tried" }];

/** paertner.com's service pages and the group of the form they open. */
export const SERVICE_GROUP: Record<string, string> = {
  "business-analysis": "custom-software",
  "brand-content": "shoot-day",
  "paid-media": "paid-ads",
  "social-media": "social-media",
  seo: "seo",
  "websites-web-apps": "websites",
  "digital-marketing": "monthly-plans",
};

/** The questions for what is chosen, once each, in group order. */
export function questionsFor(groups: QuoteGroup[], choice: Choice, custom: boolean): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  for (const g of groups) {
    if (!g.packages.some((p) => p.slug in choice)) continue;
    for (const q of GROUP_QUESTIONS[g.slug] ?? []) if (!seen.has(q.key)) (seen.add(q.key), out.push(q));
  }
  if (custom) for (const q of CUSTOM_QUESTIONS) if (!seen.has(q.key)) (seen.add(q.key), out.push(q));
  return out;
}

export function formatUsd(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2, maximumFractionDigits: 2 }).format(dollars);
}

export type Estimate = { monthlyCents: number; oneTimeCents: number; hasFrom: boolean };

/** Monthly and one-time totals, as the app counts them (projects are one-time). */
export function estimate(groups: QuoteGroup[], choice: Choice, custom: boolean): Estimate {
  let monthlyCents = 0;
  let oneTimeCents = 0;
  let hasFrom = custom;
  for (const g of groups)
    for (const p of g.packages) {
      const addons = choice[p.slug];
      if (!addons) continue;
      if (p.priceFrom || p.priceCents == null) hasFrom = true;
      if (p.billing === "monthly") monthlyCents += p.priceCents ?? 0;
      else oneTimeCents += p.priceCents ?? 0;
      for (const a of p.addons) {
        const q = addons[a.slug];
        if (!q) continue;
        if (a.billing === "monthly") monthlyCents += a.priceCents * q;
        else oneTimeCents += a.priceCents * q;
      }
    }
  return { monthlyCents, oneTimeCents, hasFrom };
}

export function estimateLines(e: Estimate): string[] {
  const from = e.hasFrom ? "from " : "";
  const lines: string[] = [];
  if (e.monthlyCents > 0) lines.push(`${from}${formatUsd(e.monthlyCents)} per month`);
  if (e.oneTimeCents > 0) lines.push(`${e.monthlyCents > 0 ? "" : from}${formatUsd(e.oneTimeCents)} one time`);
  return lines.length ? lines : ["Priced in our call"];
}

/** The request the app expects, from the form's state. */
export function quotePayload(choice: Choice) {
  return Object.entries(choice).map(([slug, addons]) => ({ slug, addons: Object.entries(addons).map(([a, quantity]) => ({ slug: a, quantity })) }));
}
