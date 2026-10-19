"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n";
import { AlertIcon, CheckIcon } from "../ui/icons";
import type { SubmitState } from "./useLeadSubmit";

export function FormErrorBanner({ state, t, contactHint }: { state: SubmitState; t: Dictionary["form"]; contactHint?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "invalid" || state.status === "error") ref.current?.focus();
  }, [state]);

  if (state.status !== "invalid" && state.status !== "error") return null;
  const message =
    state.status === "invalid"
      ? t.errorsTitle
      : state.reason === "not_configured"
        ? t.notConfigured
        : state.reason === "rate_limited"
          ? t.rateLimited
          : t.failureBody;
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="flex gap-3 rounded-[var(--radius-md)] border border-danger/30 bg-red-50 p-4 text-sm text-danger focus:outline-none">
      <AlertIcon size={20} className="shrink-0" />
      <div>
        {state.status === "error" ? <p className="font-semibold">{t.failureTitle}</p> : null}
        <p className={state.status === "error" ? "mt-1 text-ink/80" : "font-medium"}>{message}</p>
        {state.status === "error" && contactHint ? <div className="mt-2 text-ink/80">{contactHint}</div> : null}
      </div>
    </div>
  );
}

export function SuccessPanel({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="rounded-[var(--radius-md)] border border-success/30 bg-green-50 p-6 focus:outline-none sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success text-white">
        <CheckIcon size={22} />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function fieldError(state: SubmitState, name: string, t: Dictionary["form"]): string | undefined {
  if (state.status !== "invalid") return undefined;
  const key = state.fields[name] as keyof Dictionary["form"]["errors"] | undefined;
  return key ? (t.errors[key] ?? t.errors.required) : undefined;
}
