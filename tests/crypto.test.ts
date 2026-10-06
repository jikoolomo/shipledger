import { describe, expect, it } from "vitest";
import { computeEvidenceDigest, sha256Hex, toCanonicalJson } from "../packages/crypto/src/index.js";

describe("Crypto Module (Deterministic Canonical JSON & Digest)", () => {
  it("should produce identical canonical JSON regardless of object key order", () => {
    const objA = { b: 2, a: 1, c: { y: "hello", x: "world" } };
    const objB = { c: { x: "world", y: "hello" }, a: 1, b: 2 };

    const canonicalA = toCanonicalJson(objA);
    const canonicalB = toCanonicalJson(objB);

    expect(canonicalA).toBe(canonicalB);
    expect(sha256Hex(canonicalA)).toBe(sha256Hex(canonicalB));
  });

  it("should omit integrity field when calculating evidence digest", () => {
    const payload = {
      schema_version: "shipledger.evidence.v1",
      release: { commit_sha: "abcdef123456" },
      integrity: {
        algorithm: "sha256",
        evidence_digest: "some_old_digest"
      }
    };

    const digest1 = computeEvidenceDigest(payload);

    // Changing the integrity field itself should NOT change the computed digest
    payload.integrity.evidence_digest = "different_digest";
    const digest2 = computeEvidenceDigest(payload);

    expect(digest1).toBe(digest2);
    expect(digest1).toHaveLength(64);
  });
});
