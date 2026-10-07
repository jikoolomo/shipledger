import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cryptographically verifies GitHub webhook HMAC-SHA256 signature (Section 35, 37)
 */
export function verifyGitHubWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = signatureHeader.substring(7);
  const calculatedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const calculatedBuf = Buffer.from(calculatedSignature, "hex");

    if (expectedBuf.length !== calculatedBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, calculatedBuf);
  } catch {
    return false;
  }
}
