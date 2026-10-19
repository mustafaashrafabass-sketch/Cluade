"use client";

import { useState } from "react";

export type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; reference: string }
  | { status: "invalid"; fields: Record<string, string> }
  | { status: "error"; reason: "not_configured" | "rate_limited" | "failed" };

/** POSTs a FormData to a lead API route and reports exactly what the server said. */
export function useLeadSubmit(endpoint: string) {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function submit(form: FormData): Promise<SubmitState> {
    setState({ status: "submitting" });
    let next: SubmitState;
    try {
      const res = await fetch(endpoint, { method: "POST", body: form, headers: { accept: "application/json" } });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reference?: string;
        error?: string;
        fields?: Record<string, string>;
      };
      if (res.ok && body.ok && body.reference) next = { status: "success", reference: body.reference };
      else if (body.error === "validation" && body.fields) next = { status: "invalid", fields: body.fields };
      else if (body.error === "not_configured") next = { status: "error", reason: "not_configured" };
      else if (res.status === 429) next = { status: "error", reason: "rate_limited" };
      else next = { status: "error", reason: "failed" };
    } catch {
      next = { status: "error", reason: "failed" };
    }
    setState(next);
    return next;
  }

  return { state, setState, submit };
}
