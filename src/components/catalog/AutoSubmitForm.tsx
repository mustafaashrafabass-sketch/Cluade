"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormHTMLAttributes } from "react";

/**
 * A plain GET form (works without JavaScript) that, when JavaScript is
 * available, re-runs the search as soon as a filter changes.
 */
export function AutoSubmitForm({ children, action, ...props }: FormHTMLAttributes<HTMLFormElement> & { action: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      {...props}
      action={action}
      method="get"
      aria-busy={pending}
      data-pending={pending ? "" : undefined}
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (target.type === "search" || target.type === "text") return;
        const params = new URLSearchParams();
        for (const [k, v] of new FormData(e.currentTarget)) {
          if (typeof v === "string" && v !== "") params.append(k, v);
        }
        params.delete("page");
        startTransition(() => router.push(`${action}${params.size ? `?${params}` : ""}`, { scroll: false }));
      }}
    >
      {children}
    </form>
  );
}
