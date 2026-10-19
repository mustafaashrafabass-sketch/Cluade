// Polite HTTP helpers for the importer: identifies itself, retries transient
// failures with backoff, and spaces requests out.

const USER_AGENT = "AlmanfzCatalogMigration/1.0 (+catalog import for the Almanfz website)";

export interface FetchOptions {
  retries?: number;
  delayMs?: number;
  accept?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

export async function fetchWithRetry(url: string, opts: FetchOptions = {}): Promise<Response> {
  const { retries = 3, delayMs = 250, accept = "*/*" } = opts;
  let attempt = 0;
  for (;;) {
    const wait = lastRequest + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        attempt++;
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return res;
    } catch (error) {
      if (attempt >= retries) throw error;
      attempt++;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

export async function fetchJson<T>(url: string, opts?: FetchOptions): Promise<{ status: number; data: T | null; headers: Headers }> {
  const res = await fetchWithRetry(url, { accept: "application/json", ...opts });
  if (!res.ok) return { status: res.status, data: null, headers: res.headers };
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("json")) return { status: res.status, data: null, headers: res.headers };
  try {
    return { status: res.status, data: (await res.json()) as T, headers: res.headers };
  } catch {
    return { status: res.status, data: null, headers: res.headers };
  }
}

export async function fetchText(url: string, opts?: FetchOptions): Promise<{ status: number; text: string | null; url: string }> {
  const res = await fetchWithRetry(url, { accept: "text/html,application/xml,text/xml;q=0.9,*/*;q=0.8", ...opts });
  if (!res.ok) return { status: res.status, text: null, url: res.url || url };
  return { status: res.status, text: await res.text(), url: res.url || url };
}

/** Run tasks with a fixed concurrency. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Minimal robots.txt check for "User-agent: *" Disallow rules. */
export async function robotsAllows(base: string): Promise<(path: string) => boolean> {
  const { text } = await fetchText(new URL("/robots.txt", base).toString()).catch(() => ({ text: null }));
  if (!text) return () => true;
  const disallow: string[] = [];
  let applies = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const [k, ...rest] = line.split(":");
    const key = k?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") applies = value === "*";
    else if (applies && key === "disallow" && value) disallow.push(value);
  }
  return (path) => !disallow.some((rule) => path.startsWith(rule.replace(/\*.*$/, "")));
}
