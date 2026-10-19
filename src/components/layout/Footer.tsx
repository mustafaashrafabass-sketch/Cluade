import Link from "next/link";
import { company, localized, telLink, whatsappLink } from "@/lib/company";
import { href, type Dictionary, type Locale } from "@/lib/i18n";
import { TrackedLink } from "../analytics/TrackedLink";
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "../ui/icons";
import { Logo } from "../ui/Logo";

export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  const year = new Date().getFullYear();
  const legalName = localized(company.legalName, locale) ?? t.meta.siteName;
  const address = localized(company.address, locale);
  const wa = whatsappLink(t.meta.siteName);

  const explore = [
    { href: href(locale, "/products"), label: t.nav.products },
    { href: href(locale, "/categories"), label: t.nav.categories },
    { href: href(locale, "/quote"), label: t.nav.quoteList },
    { href: href(locale, "/rfq"), label: t.nav.submitBoq },
  ];
  const companyLinks = [
    { href: href(locale, "/about"), label: t.nav.about },
    { href: href(locale, "/contact"), label: t.nav.contact },
    { href: href(locale, "/privacy"), label: t.nav.privacy },
  ];
  const linkClass = "text-sm text-white/70 transition-colors hover:text-white";

  return (
    <footer className="mt-auto bg-navy-950 text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="max-w-sm">
          <Logo inverse tagline={t.meta.tagline} />
          <p className="mt-5 text-sm leading-relaxed text-white/65">{t.footer.about}</p>
        </div>
        <nav aria-label={t.footer.explore}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">{t.footer.explore}</h2>
          <ul className="mt-4 space-y-2.5">
            {explore.map((l) => (
              <li key={l.href}><Link className={linkClass} href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.footer.company}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">{t.footer.company}</h2>
          <ul className="mt-4 space-y-2.5">
            {companyLinks.map((l) => (
              <li key={l.href}><Link className={linkClass} href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">{t.footer.getInTouch}</h2>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            {company.phone ? (
              <li className="flex items-center gap-2.5">
                <PhoneIcon size={16} className="text-white/45" />
                <TrackedLink href={telLink(company.phone)} className="ltr-id hover:text-white" event={{ name: "contact_click", method: "phone", location: "footer" }}>
                  {company.phone}
                </TrackedLink>
              </li>
            ) : null}
            {company.email ? (
              <li className="flex items-center gap-2.5">
                <MailIcon size={16} className="text-white/45" />
                <TrackedLink href={`mailto:${company.email}`} className="hover:text-white" event={{ name: "contact_click", method: "email", location: "footer" }}>
                  {company.email}
                </TrackedLink>
              </li>
            ) : null}
            {wa ? (
              <li className="flex items-center gap-2.5">
                <WhatsAppIcon size={16} className="text-white/45" />
                <TrackedLink href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-white" event={{ name: "contact_click", method: "whatsapp", location: "footer" }}>
                  {t.contact.whatsapp}
                </TrackedLink>
              </li>
            ) : null}
            <li className="flex items-start gap-2.5">
              <PinIcon size={16} className="mt-0.5 shrink-0 text-white/45" />
              <span>{address ?? localized(company.city, locale)}</span>
            </li>
            <li>
              <Link href={href(locale, "/contact")} className="font-semibold text-white hover:underline">
                {t.contact.title} →
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {legalName}. {t.footer.rights}</p>
          {company.commercialRegistration || company.vatNumber ? (
            <p className="flex gap-4">
              {company.commercialRegistration ? <span>{t.footer.cr} <span className="ltr-id">{company.commercialRegistration}</span></span> : null}
              {company.vatNumber ? <span>{t.footer.vat} <span className="ltr-id">{company.vatNumber}</span></span> : null}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
