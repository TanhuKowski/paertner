"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import ArrowIcon from "@/components/ArrowIcon";
import { estimate, estimateLines, formatUsd, questionsFor, quotePayload, type Choice, type Question, type QuoteCatalog, type QuotePackage } from "@/lib/quote";

const STEPS = ["What you need", "About the project", "Pick a time", "Your details"] as const;
const EASTERN = "America/New_York";

function dayKey(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function timeText(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
function longWhen(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
function zoneName(tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? tz;
}

function PackageCard({ p, chosen, onToggle, addons, onAddon }: { p: QuotePackage; chosen: boolean; onToggle: () => void; addons: Record<string, number> | undefined; onAddon: (slug: string, qty: number) => void }) {
  return (
    <div className={"quote-package" + (chosen ? " is-chosen" : "") + (p.featured ? " is-featured" : "")} id={"package-" + p.slug}>
      <button type="button" className="quote-package-pick" aria-pressed={chosen} onClick={onToggle}>
        <span className="quote-package-name">{p.name}</span>
        <span className="quote-package-price">{p.priceText}</span>
        {p.compareNote && <span className="quote-package-note">{p.compareNote}</span>}
        {p.gain && <span className="quote-package-gain">{p.gain}</span>}
        {p.priceNote && <span className="quote-package-note">{p.priceNote}</span>}
        <span className="quote-package-check" aria-hidden>{chosen ? "Chosen" : "Choose"}</span>
      </button>
      {p.details.length > 0 && (
        <details className="quote-package-details">
          <summary>What is included</summary>
          <dl>
            {p.details.map((d, i) => (
              <div key={i}>
                <dt>{d.label}</dt>
                <dd>{d.text}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {chosen && p.addons.length > 0 && (
        <fieldset className="quote-addons">
          <legend>Add-ons</legend>
          {p.addons.map((a) => {
            const qty = addons?.[a.slug] ?? 0;
            return (
              <div key={a.slug} className="quote-addon">
                <label>
                  <input type="checkbox" checked={qty > 0} onChange={(e) => onAddon(a.slug, e.target.checked ? 1 : 0)} />
                  <span>
                    {a.name}
                    <small>
                      {a.priceText}
                      {a.note ? ` · ${a.note}` : ""}
                    </small>
                  </span>
                </label>
                {qty > 0 && a.allowQuantity && (
                  <span className="quote-qty">
                    <button type="button" aria-label={`Fewer: ${a.name}`} onClick={() => onAddon(a.slug, Math.max(1, qty - 1))} disabled={qty <= 1}>
                      −
                    </button>
                    <span aria-live="polite">{qty}</span>
                    <button type="button" aria-label={`More: ${a.name}`} onClick={() => onAddon(a.slug, Math.min(20, qty + 1))} disabled={qty >= 20}>
                      +
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}

function QuestionField({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  if (q.kind === "chips") {
    const chosen = value ? value.split(", ") : [];
    return (
      <fieldset className="quote-chips">
        <legend>{q.label}</legend>
        <div>
          {q.options.map((o) => {
            const on = chosen.includes(o);
            return (
              <button key={o} type="button" aria-pressed={on} className={on ? "is-on" : ""} onClick={() => onChange((on ? chosen.filter((x) => x !== o) : [...chosen, o]).join(", "))}>
                {o}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  return (
    <label>
      {q.label}
      {q.kind === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose</option>
          {q.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : q.kind === "textarea" ? (
        <textarea rows={3} maxLength={2000} value={value} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={q.kind === "url" ? "url" : "text"} inputMode={q.kind === "url" ? "url" : undefined} maxLength={300} value={value} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

/**
 * The four-step quote request (/quote): packages and add-ons, the project, a meeting time from paertner's free slots,
 * and the contact details. It sends to this site's /api/quote, which passes it to paertner Dashboard.
 */
export default function QuoteForm({ catalog, initialGroup }: { catalog: QuoteCatalog; initialGroup?: string }) {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<Choice>({});
  const [custom, setCustom] = useState(false);
  const [about, setAbout] = useState({ business_name: "", website: "", industry: "", city: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", heard: "" });
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ number: string; startsAt: string | null } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [tz, setTz] = useState(EASTERN);

  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || EASTERN);
    } catch {}
  }, []);

  useEffect(() => {
    if (!initialGroup) return;
    // Instant: the page's smooth scrolling would be cut short while the page settles.
    const frame = requestAnimationFrame(() => document.getElementById("group-" + initialGroup)?.scrollIntoView({ block: "start", behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [initialGroup]);

  const groups = catalog.groups;
  const est = useMemo(() => estimate(groups, choice, custom), [groups, choice, custom]);
  const chosenPackages = useMemo(() => groups.flatMap((g) => g.packages.filter((p) => p.slug in choice)), [groups, choice]);
  const questions = useMemo(() => questionsFor(groups, choice, custom), [groups, choice, custom]);
  const otherZone = tz !== EASTERN && zoneName(tz) !== zoneName(EASTERN);

  const loadSlots = () => {
    setSlots(null);
    setSlotsError("");
    fetch("/api/quote/slots", { headers: { Accept: "application/json" } })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "We could not load the free times.");
        const list: string[] = d.slots ?? [];
        setSlots(list);
        setDay((cur) => (cur && list.some((s) => dayKey(s, EASTERN) === cur) ? cur : list[0] ? dayKey(list[0], EASTERN) : null));
        setSlot((cur) => (cur && list.includes(cur) ? cur : null));
      })
      .catch((e: Error) => {
        setSlots([]);
        setSlotsError(e.message);
      });
  };

  useEffect(() => {
    if (step === 2 && slots === null) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const go = (n: number) => {
    setError("");
    setStep(n);
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots ?? []) {
      const k = dayKey(s, EASTERN);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots]);

  const canNext = [chosenPackages.length > 0 || custom, about.business_name.trim().length > 0, !!slot, contact.name.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email.trim()) && consent][step];

  const submit = async () => {
    if (busy || !slot) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          packages: quotePayload(choice),
          custom_plan: custom,
          business_name: about.business_name.trim(),
          website: about.website.trim() || undefined,
          industry: about.industry.trim() || undefined,
          city: about.city.trim() || undefined,
          answers: questions.filter((q) => (answers[q.key] ?? "").trim()).map((q) => ({ key: q.key, label: q.label, value: answers[q.key]!.trim() })),
          message: message.trim() || undefined,
          contact_name: contact.name.trim(),
          contact_email: contact.email.trim(),
          contact_phone: contact.phone.trim() || undefined,
          heard_from: contact.heard || undefined,
          starts_at: slot,
          consent: true,
          company_site: trap,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 409 && /time was just booked/i.test(d.error ?? "")) {
          setSlot(null);
          loadSlots();
          go(2);
        }
        throw new Error(d.error || "Your request could not be sent. Please try again.");
      }
      setDone({ number: d.number, startsAt: d.startsAt ?? slot });
      requestAnimationFrame(() => heading.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <section className="quote-done" aria-live="polite">
        <h2 ref={heading} tabIndex={-1}>
          Request received.
        </h2>
        <p>
          Thank you. Your request <strong>{done.number}</strong> is with our team, and your call on <strong>{done.startsAt ? `${longWhen(done.startsAt, EASTERN)} Eastern` : "the time you chose"}</strong> is held for you.
        </p>
        <ol>
          <li>We confirm the call within one business day and email you the meeting link with a calendar invite.</li>
          <li>In the call we agree the plan and the price. Nothing is charged before that.</li>
          <li>Once you approve, we set up your client portal and start onboarding.</li>
        </ol>
        <p className="form-note">A confirmation is on its way to {contact.email}. Need another time? Reply to it.</p>
      </section>
    );

  return (
    <div className="quote">
      <ol className="quote-steps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "is-current" : i < step ? "is-done" : ""} aria-current={i === step ? "step" : undefined}>
            {i < step ? (
              <button type="button" onClick={() => go(i)}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {s}
              </button>
            ) : (
              <span>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {s}
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="quote-layout">
        <div className="quote-main">
          <h2 ref={heading} tabIndex={-1} className="quote-heading">
            {["What do you need?", "About the project", "Pick a time for a call", "Your details"][step]}
          </h2>

          {step === 0 && (
            <div className="quote-groups">
              <p className="quote-lead">Choose one or more packages, or a custom plan. The estimate updates as you go; the final plan and price are agreed in a free 30-minute call.</p>
              {groups.map((g) => (
                <section key={g.slug} id={"group-" + g.slug} className="quote-group" aria-labelledby={"group-title-" + g.slug}>
                  {g.eyebrow && <p className="section-label">{g.eyebrow}</p>}
                  <h3 id={"group-title-" + g.slug}>{g.name}</h3>
                  {g.description && <p className="quote-group-desc">{g.description}</p>}
                  <div className="quote-packages">
                    {g.packages.map((p) => (
                      <PackageCard
                        key={p.slug}
                        p={p}
                        chosen={p.slug in choice}
                        addons={choice[p.slug]}
                        onToggle={() =>
                          setChoice((c) => {
                            const next = { ...c };
                            if (p.slug in next) delete next[p.slug];
                            else next[p.slug] = {};
                            return next;
                          })
                        }
                        onAddon={(a, qty) =>
                          setChoice((c) => {
                            const cur = { ...(c[p.slug] ?? {}) };
                            if (qty > 0) cur[a] = qty;
                            else delete cur[a];
                            return { ...c, [p.slug]: cur };
                          })
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
              <section className="quote-group">
                <h3>Something else</h3>
                <div className="quote-packages">
                  <div className={"quote-package" + (custom ? " is-chosen" : "")}>
                    <button type="button" className="quote-package-pick" aria-pressed={custom} onClick={() => setCustom((v) => !v)}>
                      <span className="quote-package-name">Custom plan</span>
                      <span className="quote-package-price">Priced in our call</span>
                      <span className="quote-package-gain">Tell us what you need and we put the right mix together with you.</span>
                      <span className="quote-package-check" aria-hidden>{custom ? "Chosen" : "Choose"}</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {step === 1 && (
            <div className="contact-form quote-fields">
              <div className="form-row">
                <label>
                  Business name *
                  <input required maxLength={160} autoComplete="organization" value={about.business_name} onChange={(e) => setAbout({ ...about, business_name: e.target.value })} placeholder="Your company" />
                </label>
                <label>
                  Website
                  <input type="url" inputMode="url" maxLength={300} autoComplete="url" value={about.website} onChange={(e) => setAbout({ ...about, website: e.target.value })} placeholder="https://yourcompany.com" />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Industry
                  <input maxLength={120} value={about.industry} onChange={(e) => setAbout({ ...about, industry: e.target.value })} placeholder="Kitchen remodeling" />
                </label>
                <label>
                  City
                  <input maxLength={120} autoComplete="address-level2" value={about.city} onChange={(e) => setAbout({ ...about, city: e.target.value })} placeholder="Arlington, VA" />
                </label>
              </div>
              {questions.map((q) => (
                <QuestionField key={q.key} q={q} value={answers[q.key] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))} />
              ))}
              <label>
                Anything else we should know?
                <textarea rows={4} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Goals, deadlines, what has or has not worked so far." />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="quote-time">
              <p className="quote-lead">
                A 30-minute call, online. Times are shown in Eastern time{otherZone ? `, with your time (${zoneName(tz)}) beside them` : ""}. We confirm within one business day.
              </p>
              {slots === null ? (
                <p className="form-note">Loading free times…</p>
              ) : slots.length === 0 ? (
                <div className="form-status error" role="alert">
                  {slotsError || "There are no free times in the coming weeks."} Write to <a href="mailto:hello@paertner.com">hello@paertner.com</a> and we find one with you.
                </div>
              ) : (
                <>
                  <div className="quote-days" role="listbox" aria-label="Day">
                    {[...byDay.keys()].map((k) => {
                      const d = new Date(`${k}T12:00:00`);
                      return (
                        <button key={k} type="button" role="option" aria-selected={day === k} className={day === k ? "is-on" : ""} onClick={() => setDay(k)}>
                          <span>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                          <strong>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong>
                        </button>
                      );
                    })}
                  </div>
                  <div className="quote-times" role="listbox" aria-label="Time">
                    {(day ? (byDay.get(day) ?? []) : []).map((s) => (
                      <button key={s} type="button" role="option" aria-selected={slot === s} className={slot === s ? "is-on" : ""} onClick={() => setSlot(s)}>
                        <strong>{timeText(s, EASTERN)} ET</strong>
                        {otherZone && <span>{timeText(s, tz)} your time</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="contact-form quote-fields">
              <div className="form-row">
                <label>
                  Your name *
                  <input required maxLength={160} autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Alex Morgan" />
                </label>
                <label>
                  Work email *
                  <input required type="email" maxLength={254} autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="alex@company.com" />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Phone
                  <input type="tel" maxLength={40} autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="(703) 555-0100" />
                </label>
                <label>
                  How did you hear about us?
                  <select value={contact.heard} onChange={(e) => setContact({ ...contact, heard: e.target.value })}>
                    <option value="">Choose</option>
                    {["Google search", "Social media", "A referral", "An event", "Something else"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              </div>
              {catalog.terms && (
                <details className="quote-terms">
                  <summary>Terms that apply to every package</summary>
                  <div>{catalog.terms}</div>
                </details>
              )}
              <div className="honeypot" aria-hidden>
                <label>
                  Company site
                  <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
                </label>
              </div>
              <label className="consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                <span>
                  I agree that Paertner may use these details to answer my request and arrange the call. Read the <a href="/privacy">privacy notice</a>.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="form-status error" role="alert">
              {error}
            </div>
          )}

          <div className="quote-nav">
            {step > 0 && (
              <button type="button" className="quote-back" onClick={() => go(step - 1)}>
                Back
              </button>
            )}
            {step < 3 ? (
              <button type="button" className="form-submit" disabled={!canNext} onClick={() => go(step + 1)}>
                <span>Continue</span>
                <span aria-hidden>
                  <ArrowIcon />
                </span>
              </button>
            ) : (
              <button type="button" className="form-submit" disabled={!canNext || busy} onClick={submit}>
                <span>{busy ? "Sending your request…" : "Send request"}</span>
                <span aria-hidden>
                  <ArrowIcon />
                </span>
              </button>
            )}
          </div>
        </div>

        <aside className="quote-summary" aria-label="Your request">
          <p className="section-label">Your request</p>
          {chosenPackages.length === 0 && !custom ? (
            <p className="quote-summary-empty">Nothing chosen yet.</p>
          ) : (
            <ul>
              {chosenPackages.map((p) => (
                <li key={p.slug}>
                  <span>{p.name}</span>
                  <span>{p.priceText}</span>
                  {p.addons
                    .filter((a) => choice[p.slug]?.[a.slug])
                    .map((a) => (
                      <small key={a.slug}>
                        + {a.name}
                        {choice[p.slug]![a.slug]! > 1 ? ` x ${choice[p.slug]![a.slug]}` : ""} · {formatUsd(a.priceCents * choice[p.slug]![a.slug]!)}
                        {a.billing === "monthly" ? "/mo" : ""}
                      </small>
                    ))}
                </li>
              ))}
              {custom && (
                <li>
                  <span>Custom plan</span>
                  <span>Priced in our call</span>
                </li>
              )}
            </ul>
          )}
          <div className="quote-estimate">
            <span>Estimate</span>
            {estimateLines(est).map((l) => (
              <strong key={l}>{l}</strong>
            ))}
          </div>
          {slot && <p className="quote-summary-time">Call: {longWhen(slot, EASTERN)} ET</p>}
          <p className="form-note">From our published prices. The final plan and price are agreed in the call; nothing is charged before that.</p>
        </aside>
      </div>
    </div>
  );
}
