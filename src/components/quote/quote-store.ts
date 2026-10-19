"use client";

import { useSyncExternalStore } from "react";

/**
 * Anonymous quote basket persisted in localStorage. Product names and SKUs are
 * stored only for display; the server re-resolves every item from the catalog
 * on submission.
 */
export interface QuoteItem {
  productId: string;
  slug: string;
  name: { en?: string; ar?: string };
  sku?: string;
  image?: string;
  quantity: number;
  note: string;
}

export interface QuoteState {
  items: QuoteItem[];
  notes: string;
}

const KEY = "almanfz.quote.v1";
const EMPTY: QuoteState = { items: [], notes: "" };
const MAX_QTY = 1_000_000;

let state: QuoteState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): QuoteState {
  if (!raw || typeof raw !== "object") return EMPTY;
  const r = raw as Partial<QuoteState>;
  const items = Array.isArray(r.items)
    ? r.items
        .filter((i): i is QuoteItem => Boolean(i && typeof i.productId === "string" && typeof i.slug === "string"))
        .map((i) => ({
          productId: i.productId,
          slug: i.slug,
          name: typeof i.name === "object" && i.name ? i.name : {},
          sku: typeof i.sku === "string" ? i.sku : undefined,
          image: typeof i.image === "string" ? i.image : undefined,
          quantity: clampQty(Number(i.quantity)),
          note: typeof i.note === "string" ? i.note.slice(0, 500) : "",
        }))
        .slice(0, 200)
    : [];
  return { items, notes: typeof r.notes === "string" ? r.notes.slice(0, 4000) : "" };
}

export function clampQty(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.trunc(n), 1), MAX_QTY);
}

function read(): QuoteState {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = read();
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = read();
      listeners.forEach((l) => l());
    }
  });
}

function commit(next: QuoteState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / quota): the list still works for this page view.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useQuote(): QuoteState & { ready: boolean } {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (hydrate(), state),
    () => EMPTY,
  );
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return { ...snapshot, ready };
}

export const quoteActions = {
  add(item: Omit<QuoteItem, "note" | "quantity">, quantity: number) {
    hydrate();
    const existing = state.items.find((i) => i.productId === item.productId);
    const items = existing
      ? state.items.map((i) =>
          i.productId === item.productId ? { ...i, ...item, quantity: clampQty(i.quantity + quantity) } : i,
        )
      : [...state.items, { ...item, quantity: clampQty(quantity), note: "" }];
    commit({ ...state, items });
  },
  setQuantity(productId: string, quantity: number) {
    commit({ ...state, items: state.items.map((i) => (i.productId === productId ? { ...i, quantity: clampQty(quantity) } : i)) });
  },
  setNote(productId: string, note: string) {
    commit({ ...state, items: state.items.map((i) => (i.productId === productId ? { ...i, note: note.slice(0, 500) } : i)) });
  },
  remove(productId: string) {
    commit({ ...state, items: state.items.filter((i) => i.productId !== productId) });
  },
  setNotes(notes: string) {
    commit({ ...state, notes: notes.slice(0, 4000) });
  },
  clear() {
    commit(EMPTY);
  },
};
