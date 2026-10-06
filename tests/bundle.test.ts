import { describe, expect, it } from "vitest";
import { buildEvidenceBundle } from "../packages/core/src/index.js";
import { computeEvidenceDigest } from "../packages/crypto/src/index.js";
import { ReleaseEvidenceBundleSchema, type ShipledgerConfig } from "../packages/schema/src/index.js";

const testConfig: ShipledgerConfig = {
  schema: 1,
  mode: "advisory",
  product: { id: "tobi", name: "Tobi", version: "0.8.3" },
  profile: { type: "baseline" },
  evidence: {
    artifacts: [],
    sbom: { path: "sbom.cdx.json" },
    tests: { junit: [] }
  },
  policy: {
    vulnerability: {
      block_critical: true,
      review_high: true,
      review_known_exploited: true
    },
    risk_acceptance: { max_expiry_days: 30 }
  },
  risk_acceptances: [],
  cloud: { upload: false }
};

describe("Evidence Bundle Assembly & Integrity Verification", () => {
  it("should assemble a complete bundle matching Zod schema with verified integrity", async () => {
    const result = await buildEvidenceBundle({
      config: testConfig,
      release: {
        repository: "oruvena/tobi",
        commit_sha: "abcdef1234567890abcdef1234567890abcdef12",
        tag: "v0.8.3",
        created_at: "2026-10-06T12:00:00Z"
      },
      source: {
        branch: "main",
        actor: "developer",
        trigger: "release"
      },
      artifacts: [
        {
          name: "tobi.zip",
          path: "dist/tobi.zip",
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          size: 512,
          created_at: "2026-10-06T12:00:00Z"
        }
      ],
      tests: {
        status: "PASSED",
        passed: 10,
        failed: 0,
        skipped: 0,
        total: 10,
        reports: ["junit.xml"]
      },
      sbom: {
        status: "VERIFIED",
        format: "CycloneDX",
        component_count: 5,
        components: []
      },
      vulnerabilities: []
    });

    // 1. Zod schema validation
    const parsed = ReleaseEvidenceBundleSchema.safeParse(result.bundle);
    expect(parsed.success).toBe(true);

    // 2. Integrity digest matches
    const calculatedDigest = computeEvidenceDigest(result.bundle as any);
    expect(calculatedDigest).toBe(result.bundle.integrity.evidence_digest);

    // 3. Markdown summary generated
    expect(result.markdownSummary).toContain("ShipLedger");
    expect(result.markdownSummary).toContain("Tobi");
    expect(result.markdownSummary).toContain("READY");

    // 4. Outputs populated
    expect(result.outputs.status).toBe("READY");
    expect(result.outputs.evidence_digest).toBe(result.bundle.integrity.evidence_digest);
    expect(result.outputs.critical_count).toBe(0);
    expect(result.outputs.review_required).toBe(false);

    // 5. Tampering detection
    const tamperedBundle = JSON.parse(JSON.stringify(result.bundle));
    tamperedBundle.release.commit_sha = "0000000000000000000000000000000000000000";
    const tamperedDigest = computeEvidenceDigest(tamperedBundle);
    expect(tamperedDigest).not.toBe(result.bundle.integrity.evidence_digest);
  });
});

