"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { format, type Dictionary, type Locale } from "@/lib/i18n";
import { buttonClass } from "../ui/button";
import { ContactFieldset } from "./ContactFieldset";
import { ConsentField, FileField, Honeypot } from "./fields";
import { fieldError, FormErrorBanner, SuccessPanel } from "./FormStatus";
import { useLeadSubmit } from "./useLeadSubmit";

export function RfqForm({
  locale,
  t,
  privacyHref,
  contactHint,
}: {
  locale: Locale;
  t: Pick<Dictionary, "form" | "nav" | "quote">;
  privacyHref: string;
  contactHint?: ReactNode;
}) {
  const { state, setState, submit } = useLeadSubmit("/api/rfq");
  const [fileError, setFileError] = useState<"fileType" | "fileSize" | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (state.status === "success") {
    return (
      <SuccessPanel
        title={t.form.successTitle}
        body={format(t.form.successBody, { ref: state.reference })}
        action={
          <button
            type="button"
            className={buttonClass("secondary")}
            onClick={() => {
              setFormKey((k) => k + 1);
              setState({ status: "idle" });
            }}
          >
            {t.form.newRequest}
          </button>
        }
      />
    );
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (fileError) return;
    const form = new FormData(e.currentTarget);
    form.set("locale", locale);
    const file = form.get("attachment");
    const result = await submit(form);
    if (result.status === "success") {
      track({ name: "generate_lead", form: "rfq", has_attachment: file instanceof File && file.size > 0 });
    }
  };

  return (
    <form key={formKey} onSubmit={onSubmit} className="relative space-y-5">
      <Honeypot />
      <FormErrorBanner state={state} t={t.form} contactHint={contactHint} />
      <FileField
        label={t.form.attachmentRequired}
        name="attachment"
        hint={t.form.attachmentHint}
        removeLabel={t.quote.remove}
        error={fileError ? t.form.errors[fileError] : fieldError(state, "attachment", t.form)}
        onLocalError={(k) => {
          setFileError(k);
          if (state.status === "invalid") setState({ status: "idle" });
        }}
      />
      <ContactFieldset
        t={t.form}
        state={state}
        notesLabel={t.form.requirements}
        notesPlaceholder={t.form.requirementsPlaceholder}
      />
      <ConsentField label={t.form.consent} error={fieldError(state, "consent", t.form)} privacyHref={privacyHref} privacyLabel={t.nav.privacy} />
      <button type="submit" disabled={state.status === "submitting"} className={buttonClass("primary", "lg", "w-full sm:w-auto sm:min-w-56")}>
        {state.status === "submitting" ? t.form.submitting : t.form.submitBoq}
      </button>
    </form>
  );
}
