"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { getDictionary, href, resolveLocale } from "@/lib/i18n";

export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const locale = resolveLocale(params?.locale ?? "en");
  const t = getDictionary(locale);
  return (
    <div className="container-page py-24 text-center">
      <p className="ltr-id text-sm font-semibold text-blue">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy">{t.notFound.title}</h1>
      <p className="mt-3 text-slate">{t.notFound.body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={href(locale)} className={buttonClass("primary")}>{t.notFound.home}</Link>
        <Link href={href(locale, "/products")} className={buttonClass("secondary")}>{t.nav.products}</Link>
      </div>
    </div>
  );
}
