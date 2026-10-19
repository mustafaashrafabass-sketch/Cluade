"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { format, type Dictionary, type Locale } from "@/lib/i18n";
import { buttonClass } from "../ui/button";
import { ConsentField, Honeypot, TextArea, TextField } from "./fields";
import { fieldError, FormErrorBanner, SuccessPanel } from "./FormStatus";
import { useLeadSubmit } from "./useLeadSubmit";

export function ContactForm({
  locale,
  t,
  privacyHref,
  contactHint,
}: {
  locale: Locale;
  t: Pick<Dictionary, "form" | "nav">;
  privacyHref: string;
  contactHint?: ReactNode;
}) {
  const { state, setState, submit } = useLeadSubmit("/api/contact");
  const [formKey, setFormKey] = useState(0);
  const err = (name: string) => fieldError(state, name, t.form);

  if (state.status === "success") {
    return (
      <SuccessPanel
        title={t.form.successTitle}
        body={format(t.form.contactSuccessBody, { ref: state.reference })}
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
    const form = new FormData(e.currentTarget);
    form.set("locale", locale);
    const result = await submit(form);
    if (result.status === "success") track({ name: "generate_lead", form: "contact" });
  };

  return (
    <form key={formKey} onSubmit={onSubmit} className="relative space-y-5">
      <Honeypot />
      <FormErrorBanner state={state} t={t.form} contactHint={contactHint} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t.form.fullName} name="fullName" autoComplete="name" required maxLength={120} error={err("fullName")} />
        <TextField label={t.form.company} name="company" autoComplete="organization" maxLength={160} optionalLabel={t.form.optional} error={err("company")} />
        <TextField label={t.form.email} name="email" type="email" autoComplete="email" required maxLength={254} dir="ltr" error={err("email")} />
        <TextField label={t.form.phone} name="phone" type="tel" autoComplete="tel" maxLength={32} dir="ltr" optionalLabel={t.form.optional} error={err("phone")} />
        <TextField className="sm:col-span-2" label={t.form.subject} name="subject" maxLength={200} optionalLabel={t.form.optional} error={err("subject")} />
        <TextArea className="sm:col-span-2" label={t.form.message} name="message" required maxLength={4000} rows={6} error={err("message")} />
      </div>
      <ConsentField label={t.form.consent} error={err("consent")} privacyHref={privacyHref} privacyLabel={t.nav.privacy} />
      <button type="submit" disabled={state.status === "submitting"} className={buttonClass("primary", "lg", "w-full sm:w-auto sm:min-w-48")}>
        {state.status === "submitting" ? t.form.submitting : t.form.submitContact}
      </button>
    </form>
  );
}
