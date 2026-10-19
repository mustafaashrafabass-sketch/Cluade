import type { ReactNode } from "react";
import { TrackedLink } from "../analytics/TrackedLink";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "../ui/icons";
import { company, localized, telLink, whatsappLink } from "@/lib/company";
import type { Dictionary, Locale } from "@/lib/i18n";

/** Verified contact details from content/company.json. Renders nothing for missing fields. */
export function hasDirectContact() {
  return Boolean(company.phone || company.email || company.salesEmail || company.whatsapp);
}

export function ContactInline({ t }: { t: Dictionary }) {
  if (!hasDirectContact()) return null;
  const email = company.salesEmail ?? company.email;
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1">
      {company.phone ? <a href={telLink(company.phone)} className="ltr-id font-semibold underline">{company.phone}</a> : null}
      {email ? <a href={`mailto:${email}`} className="font-semibold underline">{email}</a> : null}
      {!company.phone && !email && company.whatsapp ? <span>{t.contact.whatsapp}</span> : null}
    </p>
  );
}

export function ContactDetails({ locale, t, location }: { locale: Locale; t: Dictionary; location: string }) {
  const rows: { icon: ReactNode; label: string; value: ReactNode }[] = [];
  const email = company.salesEmail ?? company.email;
  const wa = whatsappLink(t.meta.siteName);
  const address = localized(company.address, locale);
  const hours = localized(company.workingHours, locale);

  if (company.phone) {
    rows.push({
      icon: <PhoneIcon size={18} />,
      label: t.contact.phone,
      value: (
        <TrackedLink href={telLink(company.phone)} className="ltr-id hover:text-blue" event={{ name: "contact_click", method: "phone", location }}>
          {company.phone}
        </TrackedLink>
      ),
    });
  }
  if (email) {
    rows.push({
      icon: <MailIcon size={18} />,
      label: t.contact.email,
      value: (
        <TrackedLink href={`mailto:${email}`} className="hover:text-blue" event={{ name: "contact_click", method: "email", location }}>
          {email}
        </TrackedLink>
      ),
    });
  }
  if (wa && company.whatsapp) {
    rows.push({
      icon: <WhatsAppIcon size={18} />,
      label: t.contact.whatsapp,
      value: (
        <TrackedLink href={wa} target="_blank" rel="noopener noreferrer" className="ltr-id hover:text-blue" event={{ name: "contact_click", method: "whatsapp", location }}>
          {company.whatsapp}
        </TrackedLink>
      ),
    });
  }
  if (address) rows.push({ icon: <PinIcon size={18} />, label: t.contact.address, value: address });
  if (hours) rows.push({ icon: <ClockIcon size={18} />, label: t.contact.hours, value: hours });

  if (!rows.length) {
    return (
      <div className="space-y-3 text-sm text-slate">
        <p className="flex items-center gap-2 font-medium text-ink">
          <PinIcon size={18} className="text-blue" /> {localized(company.city, locale)}
        </p>
        <p>{t.contact.detailsPending}</p>
      </div>
    );
  }

  return (
    <dl className="space-y-4">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-blue-50 text-blue">{r.icon}</span>
          <div>
            <dt className="text-xs font-medium text-slate">{r.label}</dt>
            <dd className="mt-0.5 text-[0.9375rem] font-semibold text-ink">{r.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
