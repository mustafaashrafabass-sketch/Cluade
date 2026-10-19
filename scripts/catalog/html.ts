// HTML → plain text and structured-data extraction without external dependencies.

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", times: "×", deg: "°",
  plusmn: "±", micro: "µ", sup2: "²", sup3: "³", frac12: "½", frac14: "¼", frac34: "¾",
  laquo: "«", raquo: "»", middot: "·", bull: "•", copy: "©", reg: "®", trade: "™", Omega: "Ω",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[code] ?? NAMED[code.toLowerCase()] ?? m;
  });
}

/**
 * Convert product-description HTML to the catalog's plain-text format:
 * paragraphs separated by blank lines, list items prefixed with "• ".
 * Tables become "Label: value" lines.
 */
export function htmlToText(html: string | undefined | null): string {
  if (!html) return "";
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|iframe|svg)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/(td|th)>\s*<(td|th)[^>]*>/gi, ": ")
    .replace(/<tr[^>]*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|table|section|article|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  s = decodeEntities(s)
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n");
  // Keep list items together as one block, separate other blocks by a blank line.
  const lines = s.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (out.length && out.at(-1) !== "") out.push("");
      continue;
    }
    const prev = out.at(-1);
    // Lists and paragraphs are separate blocks; consecutive lines otherwise stay in one block.
    if (t.startsWith("• ") && prev && prev !== "" && !prev.startsWith("• ")) out.push("");
    if (!t.startsWith("• ") && prev?.startsWith("• ")) out.push("");
    out.push(t);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function stripTags(html: string | undefined | null): string {
  return decodeEntities((html ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** All JSON-LD objects on a page, with @graph containers flattened. */
export function extractJsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(m[1].trim()) as unknown;
      const visit = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(visit);
        else if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (Array.isArray(o["@graph"])) visit(o["@graph"]);
          if (o["@type"]) out.push(o);
        }
      };
      visit(parsed);
    } catch {
      // ignore malformed blocks
    }
  }
  return out;
}

export function hasType(o: Record<string, unknown>, type: string): boolean {
  const t = o["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

export function extractMeta(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = m[0];
    const key = tag.match(/(?:property|name|itemprop)=["']([^"']+)["']/i)?.[1];
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (key && content !== undefined && !(key in out)) out[key.toLowerCase()] = decodeEntities(content);
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) out["title"] = decodeEntities(title).trim();
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0].match(/href=["']([^"']+)["']/i)?.[1];
  if (canonical) out["canonical"] = canonical;
  const lang = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1];
  if (lang) out["lang"] = lang.toLowerCase();
  return out;
}
