import QuoteForm from "@/components/QuoteForm";
import { Breadcrumb, LinkArrow } from "@/components/ui";
import { getQuoteCatalog, quoteConfigured } from "@/lib/dashboard-quote";
import { getSite } from "@/lib/cms";
import { meta } from "@/lib/seo";
import type { QuoteCatalog } from "@/lib/quote";

export const generateMetadata = () =>
  meta("Get a quote", "Choose a Paertner package or a custom plan, see the estimate, and pick a time for a free 30-minute call.", "/quote");

/** The quote request (docs/13-sales-and-payments.md in paertner Dashboard): packages from the app, a meeting slot, the details. */
export default async function Quote({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const [site, { group }] = await Promise.all([getSite(), searchParams]);
  let catalog: QuoteCatalog | null = null;
  if (quoteConfigured()) {
    try {
      catalog = await getQuoteCatalog();
    } catch {
      catalog = null;
    }
  }
  const initialGroup = group && /^[a-z0-9-]{1,60}$/.test(group) ? group : undefined;
  return (
    <main id="main">
      <section className="page-hero wrap">
        <Breadcrumb items={[{ label: "Get a quote" }]} />
        <h1>Let’s price your next move.</h1>
        <div className="page-intro">
          <p>Choose what you need, see the estimate, and pick a time for a free 30-minute call. We agree the plan and the price together before anything starts.</p>
        </div>
      </section>
      <section className="wrap quote-section">
        {catalog && catalog.groups.length > 0 ? (
          <QuoteForm catalog={catalog} initialGroup={initialGroup} />
        ) : (
          <div className="form-status error" role="alert">
            The quote form is resting for a moment. Write to <a href={"mailto:" + (site.email || "hello@paertner.com")}>{site.email || "hello@paertner.com"}</a> or{" "}
            <LinkArrow href="/book">book a call</LinkArrow>
          </div>
        )}
      </section>
    </main>
  );
}
