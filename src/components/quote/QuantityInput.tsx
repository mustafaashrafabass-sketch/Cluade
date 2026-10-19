"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "../ui/icons";
import { clampQty } from "./quote-store";

export function QuantityInput({
  id,
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
  ariaLabel,
}: {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  ariaLabel?: string;
}) {
  // Local text state lets the field be cleared while typing; commits on blur.
  const [text, setText] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    // Value changed from outside (buttons, another tab): show it.
    setSynced(value);
    setText(String(value));
  }

  const btn =
    "flex h-11 w-11 items-center justify-center text-ink hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="inline-flex h-11 items-stretch overflow-hidden rounded-[var(--radius)] border border-line-strong bg-white">
      <button type="button" className={btn} aria-label={decreaseLabel} disabled={value <= 1} onClick={() => onChange(clampQty(value - 1))}>
        <MinusIcon size={16} />
      </button>
      <input
        id={id}
        aria-label={ariaLabel}
        inputMode="numeric"
        pattern="[0-9]*"
        className="ltr-id w-16 border-x border-line text-center text-[16px] font-medium focus:outline-none focus-visible:bg-blue-50 sm:text-sm"
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d٠-٩]/g, "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
          setText(digits);
          if (digits) onChange(clampQty(Number(digits)));
        }}
        onBlur={() => setText(String(value))}
      />
      <button type="button" className={btn} aria-label={increaseLabel} onClick={() => onChange(clampQty(value + 1))}>
        <PlusIcon size={16} />
      </button>
    </div>
  );
}
