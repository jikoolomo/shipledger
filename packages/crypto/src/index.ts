import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import canonicalize from "canonicalize";

const serializeJson = (typeof canonicalize === "function"
  ? canonicalize
  : (canonicalize as any).default || canonicalize) as (input: unknown) => string | undefined;

/**
 * Deterministically serializes any JavaScript object according to RFC 8785 (JSON Canonicalization Scheme).
 */
export function toCanonicalJson(data: unknown): string {
  const canonical = serializeJson(data);
  if (canonical === undefined) {
    throw new Error("Cannot serialize undefined or invalid structure to canonical JSON");
  }
  return canonical;
}

/**
 * Computes the SHA-256 hexadecimal hash of a string or buffer.
 */
export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Computes the SHA-256 hexadecimal hash of a file on disk.
 */
export async function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}

/**
 * Computes the canonical evidence digest for an evidence payload by omitting any existing integrity field.
 */
export function computeEvidenceDigest(evidencePayload: Record<string, unknown>): string {
  // Integrity 필드는 digest 계산 대상에서 제외
  const { integrity, ...payloadWithoutIntegrity } = evidencePayload;
  const canonicalStr = toCanonicalJson(payloadWithoutIntegrity);
  return sha256Hex(canonicalStr);
}
