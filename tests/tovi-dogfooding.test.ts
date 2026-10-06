import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildEvidenceBundle } from "../packages/core/src/index.js";
import { parseSbom } from "../packages/parsers/src/index.js";
import type { ShipledgerConfig } from "../packages/schema/src/index.js";

const fixtureSbomPath = path.resolve(__dirname, "fixtures/tovi-guest-sbom.cdx.json");

const toviConfig: ShipledgerConfig = {
  schema: 1,
  mode: "advisory",
  product: {
    id: "tovi",
    name: "Tovi",
    version: "1.0.0",
    manufacturer: "Oruvena"
  },
  profile: { type: "baseline" },
  evidence: {
    sbom: { path: fixtureSbomPath },
    tests: { junit: [] },
    artifacts: []
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

describe("Tovi Real World Dogfooding Integration", () => {
  it("should parse real Tovi CycloneDX SBOM successfully", async () => {
    const sbom = await parseSbom(fixtureSbomPath);

    expect(sbom.status).toBe("VERIFIED");
    expect(sbom.format).toBe("CycloneDX");
    expect(sbom.component_count).toBeGreaterThan(100);
    console.log(`[Dogfooding] Tovi guest-web component count: ${sbom.component_count}`);

    // Check presence of Next.js or React in components
    const hasNextOrReact = sbom.components.some(c => c.name === "next" || c.name === "react");
    expect(hasNextOrReact).toBe(true);
  });

  it("should assemble a complete release evidence bundle for Tovi", async () => {
    const sbom = await parseSbom(fixtureSbomPath);


    const result = await buildEvidenceBundle({
      config: toviConfig,
      release: {
        repository: "oruvena/tovi",
        commit_sha: "b40fdb51234567890abcdef1234567890abcdef12",
        tag: "v1.0.0-build3",
        created_at: new Date().toISOString()
      },
      source: {
        branch: "feat/business-booking-web",
        actor: "antigravity",
        trigger: "workflow_dispatch"
      },
      artifacts: [
        {
          name: "tovi-guest-web.tar.gz",
          path: "dist/tovi-guest-web.tar.gz",
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          size: 1048576,
          created_at: new Date().toISOString()
        }
      ],
      tests: {
        status: "PASSED",
        passed: 97, // 64 (guest-web) + 33 (domain)
        failed: 0,
        skipped: 0,
        total: 97,
        reports: []
      },
      sbom,
      vulnerabilities: [],
      outputDir: "/tmp"
    });

    expect(result.bundle.schema_version).toBe("shipledger.evidence.v1");
    expect(result.outputs.status).toBe("READY");
    expect(result.outputs.evidence_digest).toHaveLength(64);
    expect(result.markdownSummary).toContain("Tovi v1.0.0-build3");
    expect(result.markdownSummary).toContain("97 passed");
    console.log(`[Dogfooding] Generated Tovi Evidence Digest: ${result.outputs.evidence_digest}`);
  });
});
