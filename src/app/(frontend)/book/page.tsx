import { getSite, getPage, getServices } from "@/lib/cms";
import { meta } from "@/lib/seo";
import { Breadcrumb, SceneImage, LinkArrow } from "@/components/ui";
import ContactForm from "@/components/ContactForm";
export const generateMetadata = () =>
  meta(
    "Book a call",
    "Tell Paertner about your next project. Start a conversation about digital marketing, a website, or a web application.",
    "/book",
  );
export default async function Book({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; sent?: string; error?: string }>;
}) {
  const [site, services, query, page] = await Promise.all([
    getSite(),
    getServices(),
    searchParams,
    getPage("book"),
  ]);
  const scheduler =
    site.bookingURL && /^https:\/\//.test(site.bookingURL)
      ? site.bookingURL
      : "";
  return (
    <main id="main">
      <section className="page-hero wrap">
        <Breadcrumb items={[{ label: "Book a call" }]} />
        <h1>{page?.title || "Let’s open something good."}</h1>
        <div className="page-intro">
          <p>{page?.intro || site.ctaBody}</p>
        </div>
      </section>
      <section className="book-layout wrap">
        <div className="book-aside">
          <h2>
            A first conversation.
            <br />A useful next step.
          </h2>
          <p>
            Tell us a little about your business and what you have in mind. We
            will review your inquiry and work out a time to talk.
          </p>
          <LinkArrow href="/quote">See packages and get a quote</LinkArrow>
          <p>Prefer to write first? Use the form, or email us.</p>
          {scheduler ? (
            <LinkArrow href={scheduler}>Choose a time</LinkArrow>
          ) : (
            <LinkArrow href={"mailto:" + site.email}>{site.email}</LinkArrow>
          )}
          <div className="book-picture">
            <SceneImage
              src={page?.image?.url || ""}
              alt="A search preview connected to a Paertner landing experience"
              sizes="380px"
            />
          </div>
        </div>
        <div id="contact-form" className="contact-form-anchor">
          {query.error && (
            <p role="alert" className="form-status error">
              Please check your details, accept the privacy notice, and try
              again.
            </p>
          )}
          <ContactForm
            services={services.map((s) => s.title)}
            selected={query.service}
            sent={query.sent === "1"}
          />
        </div>
      </section>
      <section className="faq-section wrap">
        <h2>Before we begin.</h2>
        <div>
          {site.faqs.map((q, i) => (
            <details key={i}>
              <summary>{q.question}</summary>
              <p>{q.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
