"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";
import { getDictionary, resolveLocale } from "@/lib/i18n";

export default function CatalogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ locale: string }>();
  const t = getDictionary(resolveLocale(params?.locale ?? "en"));
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page py-16">
      <div role="alert" className="mx-auto max-w-lg rounded-[var(--radius-md)] border border-line bg-white p-8 text-center">
        <AlertIcon size={28} className="mx-auto text-danger" />
        <h1 className="mt-3 text-lg font-semibold">{t.catalog.errorTitle}</h1>
        <p className="mt-2 text-sm text-slate">{t.catalog.errorBody}</p>
        <button type="button" onClick={reset} className={buttonClass("primary", "md", "mt-6")}>{t.catalog.retry}</button>
      </div>
    </div>
  );
}
