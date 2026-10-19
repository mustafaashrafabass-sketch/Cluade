"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_KEY } from "@/lib/analytics";
import type { Dictionary } from "@/lib/i18n";
import { buttonClass } from "../ui/button";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

type Choice = "granted" | "denied" | null;

function readChoice(): Choice {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Consent-aware tag loader. Google Consent Mode v2 defaults are set to
 * "denied" and no tag script is requested until the visitor accepts.
 * Renders nothing at all when no analytics ID is configured.
 */
export function Analytics({ t }: { t: Dictionary["consent"] }) {
  const [choice, setChoice] = useState<Choice>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Reading localStorage must happen after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(readChoice());
    setChecked(true);
  }, []);

  if (!GTM_ID && !GA4_ID) return null;

  const decide = (value: "granted" | "denied") => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // ignore: choice applies to this page view only
    }
    setChoice(value);
  };

  return (
    <>
      <Script id="consent-default" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});`}
      </Script>
      {choice === "granted" ? (
        <>
          <Script id="consent-update" strategy="afterInteractive">
            {`gtag('consent','update',{analytics_storage:'granted'});`}
          </Script>
          {GTM_ID ? (
            <Script id="gtm" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(GTM_ID)});`}
            </Script>
          ) : (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
              <Script id="ga4" strategy="afterInteractive">
                {`gtag('js',new Date());gtag('config',${JSON.stringify(GA4_ID)},{anonymize_ip:true});`}
              </Script>
            </>
          )}
        </>
      ) : null}
      {checked && choice === null ? (
        <div
          role="region"
          aria-label={t.title}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl animate-fade-in rounded-[var(--radius-lg)] border border-line bg-white p-4 shadow-[var(--shadow-raised)] sm:p-5"
        >
          <p className="text-sm font-semibold text-ink">{t.title}</p>
          <p className="mt-1 text-sm text-slate">{t.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={buttonClass("primary", "sm")} onClick={() => decide("granted")}>
              {t.accept}
            </button>
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => decide("denied")}>
              {t.decline}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
