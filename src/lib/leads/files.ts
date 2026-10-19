export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv"] as const;
export const ACCEPT_ATTRIBUTE =
  ".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

type Kind = "pdf" | "xlsx" | "xls" | "csv";

const CONTENT_TYPES: Record<Kind, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
};

export type FileError = "fileType" | "fileSize" | "fileContent";

export interface ValidatedFile {
  filename: string;
  contentType: string;
  size: number;
  bytes: Uint8Array;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((b, i) => bytes[i] === b);
}

/** Check the real file content, not just the extension the browser reports. */
function contentMatches(kind: Kind, bytes: Uint8Array): boolean {
  switch (kind) {
    case "pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    case "xlsx":
      return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]); // ZIP container
    case "xls":
      return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // OLE2
    case "csv": {
      // Must be text: no NUL bytes and valid UTF-8 (or plain ASCII / Windows-1256 without control bytes).
      const sample = bytes.subarray(0, 64 * 1024);
      for (const b of sample) {
        if (b === 0 || (b < 0x09) || (b > 0x0d && b < 0x20 && b !== 0x1b)) return false;
      }
      return true;
    }
  }
}

/** Strip any path, control characters and unsafe characters from the client filename. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "upload";
  const cleaned = base
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(-120);
  return cleaned || "upload";
}

export async function validateUpload(file: File): Promise<ValidatedFile | FileError> {
  const filename = sanitizeFilename(file.name);
  const ext = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] as Kind | undefined;
  if (!ext || !(ext in CONTENT_TYPES)) return "fileType";
  if (file.size === 0) return "fileContent";
  if (file.size > MAX_UPLOAD_BYTES) return "fileSize";
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return "fileSize";
  if (!contentMatches(ext, bytes)) return "fileContent";
  return { filename, contentType: CONTENT_TYPES[ext], size: bytes.byteLength, bytes };
}
