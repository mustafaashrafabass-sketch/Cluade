"use client";

import Link from "next/link";
import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from "@/lib/leads/files";
import { CloseIcon, FileIcon, UploadIcon } from "../ui/icons";

const control =
  "block w-full rounded-[var(--radius)] border bg-white px-3 text-[16px] text-ink placeholder:text-slate/80 focus:outline-none focus:ring-2 sm:text-sm";
const ok = "border-line-strong focus:border-blue focus:ring-blue/20";
const bad = "border-danger focus:border-danger focus:ring-danger/20";

interface Common {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  optionalLabel?: string;
}

function Label({ htmlFor, label, required, optionalLabel }: { htmlFor: string; label: string; required?: boolean; optionalLabel?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {label}
      {required ? <span aria-hidden className="ms-0.5 text-danger">*</span> : optionalLabel ? <span className="ms-1.5 text-xs font-normal text-slate">({optionalLabel})</span> : null}
    </label>
  );
}

function Help({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-slate">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
    </>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

export function TextField({ label, name, error, hint, optionalLabel, className = "", ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={props.required} optionalLabel={optionalLabel} />
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${control} h-11 ${error ? bad : ok}`}
        {...props}
      />
      <Help id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextArea({ label, name, error, hint, optionalLabel, className = "", ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={props.required} optionalLabel={optionalLabel} />
      <textarea
        id={id}
        name={name}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${control} py-2.5 ${error ? bad : ok}`}
        {...props}
      />
      <Help id={id} hint={hint} error={error} />
    </div>
  );
}

export function FileField({
  label,
  name,
  error,
  hint,
  optionalLabel,
  required,
  removeLabel,
  onLocalError,
}: Common & { required?: boolean; removeLabel: string; onLocalError: (key: "fileType" | "fileSize" | null) => void }) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);

  return (
    <div>
      <Label htmlFor={id} label={label} required={required} optionalLabel={optionalLabel} />
      <div
        className={`relative rounded-[var(--radius-md)] border border-dashed bg-paper px-4 py-5 transition-colors focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/20 ${
          error ? "border-danger" : "border-line-strong hover:border-navy/50"
        }`}
      >
        {file ? (
          <div className="flex items-center gap-3">
            <FileIcon size={22} className="shrink-0 text-blue" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" dir="auto">{file.name}</p>
              <p className="ltr-id text-xs text-slate">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              aria-label={`${removeLabel}: ${file.name}`}
              className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] hover:bg-white"
              onClick={() => {
                setFile(null);
                setInputKey((k) => k + 1);
                onLocalError(null);
              }}
            >
              <CloseIcon size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <UploadIcon size={22} className="shrink-0 text-slate" />
            <span className="text-slate">{hint}</span>
          </div>
        )}
        <input
          key={inputKey}
          id={id}
          name={name}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`absolute inset-0 cursor-pointer opacity-0 ${file ? "pointer-events-none" : ""}`}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && !/\.(pdf|xlsx|xls|csv)$/i.test(f.name)) {
              onLocalError("fileType");
              e.target.value = "";
              setFile(null);
              return;
            }
            if (f && f.size > MAX_UPLOAD_BYTES) {
              onLocalError("fileSize");
              e.target.value = "";
              setFile(null);
              return;
            }
            onLocalError(null);
            setFile(f);
          }}
        />
      </div>
      {error ? <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export function ConsentField({ label, error, privacyHref, privacyLabel }: { label: string; error?: string; privacyHref: string; privacyLabel: string }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name="consent"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-blue"
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-ink/80">
          {label}{" "}
          <Link href={privacyHref} className="font-medium text-blue underline-offset-2 hover:underline" target="_blank">
            {privacyLabel}
          </Link>
        </label>
      </div>
      {error ? <p id={`${id}-error`} className="mt-1 ms-8 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

/** Hidden from people and assistive technology; bots that fill it are rejected server-side. */
export function Honeypot() {
  return (
    <div aria-hidden className="sr-only">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
