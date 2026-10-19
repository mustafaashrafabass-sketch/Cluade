"use client";

import type { Dictionary } from "@/lib/i18n";
import { TextArea, TextField } from "./fields";
import { fieldError } from "./FormStatus";
import type { SubmitState } from "./useLeadSubmit";

/** Contact + company fields shared by the quote and BOQ forms. */
export function ContactFieldset({
  t,
  state,
  notesLabel,
  notesPlaceholder,
  notesDefault,
  onNotesChange,
  notesRequired = false,
}: {
  t: Dictionary["form"];
  state: SubmitState;
  notesLabel?: string;
  notesPlaceholder?: string;
  notesDefault?: string;
  onNotesChange?: (v: string) => void;
  notesRequired?: boolean;
}) {
  const err = (name: string) => fieldError(state, name, t);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label={t.fullName} name="fullName" autoComplete="name" required maxLength={120} error={err("fullName")} />
      <TextField label={t.company} name="company" autoComplete="organization" required maxLength={160} error={err("company")} />
      <TextField label={t.email} name="email" type="email" autoComplete="email" required maxLength={254} dir="ltr" error={err("email")} />
      <TextField
        label={t.phone}
        name="phone"
        type="tel"
        autoComplete="tel"
        required
        maxLength={32}
        dir="ltr"
        hint={t.phoneHint}
        error={err("phone")}
      />
      <TextField label={t.city} name="city" autoComplete="address-level2" required maxLength={80} error={err("city")} />
      <TextField label={t.projectName} name="projectName" maxLength={160} optionalLabel={t.optional} error={err("projectName")} />
      <TextArea
        className="sm:col-span-2"
        label={notesLabel ?? t.notes}
        name="notes"
        maxLength={4000}
        rows={4}
        placeholder={notesPlaceholder ?? t.notesPlaceholder}
        optionalLabel={notesRequired ? undefined : t.optional}
        defaultValue={notesDefault}
        onChange={onNotesChange ? (e) => onNotesChange(e.target.value) : undefined}
        error={err("notes")}
      />
    </div>
  );
}
