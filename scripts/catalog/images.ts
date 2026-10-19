import { createHash } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fetchWithRetry, mapLimit } from "./http.ts";
import type { Category, Product } from "../../src/lib/catalog/types.ts";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Copy Almanfz's own product images into public/catalog/images so the new site
 * no longer depends on the old host. Only raster images are accepted.
 */
export async function localizeImages(products: Product[], categories: Category[], publicDir: string) {
  const dir = path.join(publicDir, "catalog", "images");
  await mkdir(dir, { recursive: true });
  const all = [...products.flatMap((p) => p.images), ...categories.flatMap((c) => (c.image ? [c.image] : []))];
  const remote = [...new Set(all.map((i) => i.src).filter((s) => /^https?:\/\//.test(s)))];
  const mapped = new Map<string, string>();
  const failures: { url: string; reason: string }[] = [];

  await mapLimit(remote, 4, async (src, i) => {
    if (i % 100 === 0) console.log(`  images ${i + 1}/${remote.length}`);
    const hash = createHash("sha1").update(src).digest("hex").slice(0, 20);
    try {
      for (const ext of Object.values(EXT)) {
        try {
          await access(path.join(dir, `${hash}.${ext}`));
          mapped.set(src, `/catalog/images/${hash}.${ext}`);
          return;
        } catch {
          // not downloaded yet
        }
      }
      const res = await fetchWithRetry(src, { accept: "image/*", delayMs: 100 });
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!EXT[type]) throw new Error(`unsupported type ${type || "unknown"}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) throw new Error("image larger than 15 MB");
      const file = `${hash}.${EXT[type]}`;
      await writeFile(path.join(dir, file), buf);
      mapped.set(src, `/catalog/images/${file}`);
    } catch (error) {
      failures.push({ url: src, reason: `image: ${(error as Error).message}` });
    }
  });

  for (const img of all) {
    const local = mapped.get(img.src);
    if (local) img.src = local;
  }
  return { downloaded: mapped.size, failures };
}
