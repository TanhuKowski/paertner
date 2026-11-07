"use client";
import ArrowIcon from "@/components/ArrowIcon";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { CaretDown, Plus, X } from "@phosphor-icons/react";
export function Arrow({ size = 20 }: { size?: number }) {
  return <ArrowIcon size={size} />;
}
export default function Header({
  nav,
  services,
}: {
  nav: { label: string; href: string }[];
  services: { label: string; href: string }[];
}) {
  const header = useRef<HTMLElement>(null);
  const dropdown = useRef<HTMLDetailsElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const submenuPointer = useRef("");
  const pathname = usePathname();
  const submenuEvents = {
    onPointerDown: (event: React.PointerEvent<HTMLDetailsElement>) => {
      submenuPointer.current = event.pointerType;
    },
    onPointerEnter: (event: React.PointerEvent<HTMLDetailsElement>) => {
      if (event.pointerType === "mouse" && matchMedia("(any-hover: hover)").matches) event.currentTarget.open = true;
    },
    onPointerLeave: (event: React.PointerEvent<HTMLDetailsElement>) => {
      if (event.pointerType === "mouse" && matchMedia("(any-hover: hover)").matches && !event.currentTarget.querySelector(":focus-visible")) event.currentTarget.open = false;
    },
    onBlur: (event: React.FocusEvent<HTMLDetailsElement>) => {
      // Safari can blur the summary without focusing the tapped link. Hiding
      // that link here cancels its pending click; outside pointerdown handles it.
      if (!submenuPointer.current && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLDetailsElement>) => {
      submenuPointer.current = "";
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    },
  };
  const summaryClick = (event: React.MouseEvent<HTMLElement>) => {
    // Hover opens mouse menus; keep native keyboard and touchscreen activation.
    if (event.detail > 0 && submenuPointer.current === "mouse" && matchMedia("(any-hover: hover)").matches) {
      event.preventDefault();
      const details = event.currentTarget.parentElement as HTMLDetailsElement;
      details.open = true;
    }
  };
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const glass = pathname === "/" && !reduced.matches
        ? document.documentElement.hasAttribute("data-spark-launched")
        : window.scrollY > 8;
      header.current?.toggleAttribute("data-scrolled", glass);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("pageshow", update);
    window.addEventListener("paertner:spark-launch", update);
    reduced.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("pageshow", update);
      window.removeEventListener("paertner:spark-launch", update);
      reduced.removeEventListener("change", update);
    };
  }, [pathname]);
  useEffect(() => {
    const d = dialog.current;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !dropdown.current?.contains(event.target)) dropdown.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", outside);
    const close = () => {
      document.body.style.overflow = "";
      trigger.current?.focus();
    };
    d?.addEventListener("close", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      d?.removeEventListener("close", close);
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header ref={header} className={"header" + (pathname === "/" ? " header--cinema" : "")}>
        <a href="/" aria-label="Paertner home" className="brand">
          <img
            src="/identity/wordmark-light.svg"
            alt="Paertner"
            width="172"
            height="40"
          />
        </a>
        <nav aria-label="Main navigation" className="desktop-nav">
          {nav.map((n) => n.href === "/services" ? (
            <details key={n.href} ref={dropdown} className="services-dropdown" {...submenuEvents}>
              <summary onClick={summaryClick}>Services <CaretDown size={12} aria-hidden="true" /></summary>
              <div className="services-dropdown-panel">
                <a href="/services" className="services-overview">Explore all services <span aria-hidden="true"><ArrowIcon /></span></a>
                {services.map(service => <a key={service.href} href={service.href} aria-current={pathname === service.href ? "page" : undefined}>{service.label}<span aria-hidden="true"><ArrowIcon /></span></a>)}
              </div>
            </details>
          ) : (
            <a
              key={n.href}
              href={n.href}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <a href="/quote" className="header-cta">
          Get a quote <Arrow size={18} />
        </a>
        <button
          ref={trigger}
          className="menu-toggle"
          aria-label="Open navigation"
          onClick={() => {
            dialog.current?.showModal();
            document.body.style.overflow = "hidden";
          }}
        >
          <Plus size={25} />
        </button>
      </header>
      <dialog
        ref={dialog}
        className="menu-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="menu-top">
          <img
            src="/identity/wordmark-light.svg"
            alt="Paertner"
            width="172"
            height="40"
          />
          <button
            aria-label="Close navigation"
            onClick={() => dialog.current?.close()}
          >
            <X size={26} />
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {nav.map((n, i) => n.href === "/services" ? (
            <details key={n.href} className="mobile-services" onKeyDown={submenuEvents.onKeyDown}>
              <summary><span>0{i + 1}</span>Services <span aria-hidden="true"><CaretDown size={20} /></span></summary>
              <div className="mobile-services-links">
                <a href="/services">All services</a>
                {services.map(service => <a key={service.href} href={service.href}>{service.label}</a>)}
              </div>
            </details>
          ) : (
            <a key={n.href} href={n.href}>
              <span>0{i + 1}</span>
              {n.label}
              <Arrow size={34} />
            </a>
          ))}
          <a href="/quote">
            <span>04</span>Get a quote
            <Arrow size={34} />
          </a>
        </nav>
        <p>Marketing meets making.</p>
      </dialog>
    </>
  );
}
