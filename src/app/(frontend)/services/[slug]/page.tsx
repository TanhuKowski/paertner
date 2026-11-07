import ArrowIcon from "@/components/ArrowIcon";
import { serviceGuides } from "@/lib/service-guides";
import { notFound, permanentRedirect } from "next/navigation";
import { getServices, getSite, cms, asset } from "@/lib/cms";
import { meta, origin } from "@/lib/seo";
import { Breadcrumb, SceneImage, LinkArrow, Closing } from "@/components/ui";
import { SERVICE_GROUP } from "@/lib/quote";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const s = (await getServices()).find((s) => s.slug === slug);
  return s
    ? meta(
        s.seoTitle || s.title,
        s.seoDescription || s.intro,
        "/services/" + s.slug,
        asset(s),
        s,
      )
    : meta("Service not found", "This service is not available.");
}
export default async function Service({ params }: Props) {
  const { slug } = await params;
  const [services, site] = await Promise.all([getServices(), getSite()]);
  const s = services.find((s) => s.slug === slug);
  if (!s) {
    const r = await (
      await cms()
    ).find({
      collection: "redirects",
      where: { from: { equals: "/services/" + slug } },
      limit: 1,
    });
    if (r.docs[0]?.to) permanentRedirect(r.docs[0].to);
    notFound();
  }
  return (
    <main id="main">
      <section className="page-hero wrap">
        <Breadcrumb
          items={[{ label: "Services", href: "/services" }, { label: s.title }]}
        />
        <p className="section-label" style={{ marginBottom: 22 }}>
          {s.title}
        </p>
        <h1>{s.short}</h1>
        <div className="page-intro">
          <p>{s.intro}</p>
          <LinkArrow href={SERVICE_GROUP[s.slug] ? "/quote?group=" + SERVICE_GROUP[s.slug] : "/quote"}>
            Get a quote
          </LinkArrow>
        </div>
      </section>
      <div className="service-detail-image">
        <SceneImage
          src={asset(s)}
          alt={s.image?.alt || s.title + " visual world"}
          priority
        />
      </div>
      <section className="service-detail-body wrap">
        <div>
          <h2>What we bring.</h2>
          <ul className="deliverables">
            {s.deliverables.map((d, i) => (
              <li key={i}>
                {d.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="service-explanation">
          <article>
            <h2>A considered approach.</h2>
            <p>{s.approach}</p>
          </article>
          <article>
            <h2>What moves forward.</h2>
            <p>{s.outcome}</p>
          </article>
          <LinkArrow href={"/book?service=" + encodeURIComponent(s.title)}>
            Let’s talk about {s.title.toLowerCase()}
          </LinkArrow>
        </div>
      </section>
      {serviceGuides[s.slug] && <section className="service-process wrap" aria-labelledby="service-process-title">
        <div className="service-fit">
          <h2 id="service-process-title">From the first question<br />to the finished work.</h2>
          <p>{serviceGuides[s.slug].fit}</p>
        </div>
        <div className="service-process-grid">
          {serviceGuides[s.slug].steps.map((step, index) => <article key={step.title}>
            <span className="section-label">0{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p>
          </article>)}
        </div>
        <div className="service-example"><span className="section-label">What this can look like</span><p>{serviceGuides[s.slug].example}</p><LinkArrow href={"/book?service=" + encodeURIComponent(s.title)}>Discuss your scope</LinkArrow></div>
      </section>}
      <section className="wrap services-section">
        <div className="section-heading">
          <span className="section-label">Part of a bigger picture</span>
          <h2>Connect the next piece.</h2>
        </div>
        <div className="service-ledger">
          {services
            .filter((t) => t.slug !== s.slug)
            .slice(0, 3)
            .map((t) => (
              <a
                className="service-row"
                href={"/services/" + t.slug}
                key={t.id}
              >
                <span className="service-number">{t.number}</span>
                <h3>{t.title}</h3>
                <span className="service-short">{t.short}</span>
                <span className="row-arrow" aria-hidden>
                  <ArrowIcon />
                </span>
              </a>
            ))}
        </div>
      </section>
      <Closing site={site} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: s.title,
            description: s.intro,
            url: origin + "/services/" + s.slug,
            provider: {
              "@type": "Organization",
              name: "Paertner",
              url: origin,
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
