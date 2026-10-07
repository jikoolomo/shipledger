import { describe, expect, it } from "vitest";
import { buildEvidenceBundle } from "../packages/core/src/index.js";
import {
  ingestEvidenceBundle,
  recordHumanReleaseApproval,
  recordRiskDecision,
  verifyGitHubOidcToken
} from "../packages/api/src/index.js";
import { POST } from "../apps/web/src/app/api/v1/evidence/route.js";
import type { ShipledgerConfig } from "../packages/schema/src/index.js";

const testConfig: ShipledgerConfig = {
  schema: 1,
  mode: "advisory",
  product: { id: "shipledger-cloud", name: "ShipLedger Cloud", version: "1.0.0" },
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
  cloud: { upload: true }
};

describe("ShipLedger Phase 2 Cloud Ingestion & Decision API", () => {
  async function createValidBundle() {
    const result = await buildEvidenceBundle({
      config: testConfig,
      release: {
        repository: "oruvena/shipledger",
        commit_sha: "1234567890abcdef1234567890abcdef12345678",
        tag: "v1.0.0",
        created_at: "2026-10-07T12:00:00Z"
      },
      source: {
        branch: "main",
        actor: "release-bot",
        trigger: "release"
      },
      artifacts: [],
      tests: {
        status: "PASSED",
        passed: 12,
        failed: 0,
        skipped: 0,
        total: 12,
        reports: []
      },
      sbom: {
        status: "VERIFIED",
        format: "CycloneDX",
        component_count: 10,
        components: []
      },
      vulnerabilities: []
    });
    return result.bundle;
  }

  describe("Evidence Ingestion API", () => {
    it("should successfully ingest a verified evidence bundle", async () => {
      const bundle = await createValidBundle();
      const res = await ingestEvidenceBundle({
        rawEvidence: bundle
      });

      expect(res.success).toBe(true);
      expect(res.release.repository).toBe("oruvena/shipledger");
      expect(res.release.commit_sha).toBe("1234567890abcdef1234567890abcdef12345678");
      expect(res.integrity.verified).toBe(true);
      expect(res.integrity.evidence_digest).toBe(bundle.integrity.evidence_digest);
      expect(res.message).toContain("ingested successfully");
    });

    it("should reject tampered evidence bundles (Section 27)", async () => {
      const bundle = await createValidBundle();
      const tampered = JSON.parse(JSON.stringify(bundle));
      tampered.release.tag = "v9.9.9"; // tampering payload without re-hashing

      await expect(
        ingestEvidenceBundle({
          rawEvidence: tampered
        })
      ).rejects.toThrow(/Tampered evidence bundle/);
    });

    it("should reject invalid evidence schema structure", async () => {
      await expect(
        ingestEvidenceBundle({
          rawEvidence: { schema_version: "invalid.v9", random_field: true }
        })
      ).rejects.toThrow(/Invalid Release Evidence Bundle schema/);
    });

    it("should verify OIDC claims and allow ingestion when valid", async () => {
      const bundle = await createValidBundle();
      const devToken = "dev-mock-token:oruvena/shipledger;1234567890abcdef1234567890abcdef12345678";

      const res = await ingestEvidenceBundle({
        rawEvidence: bundle,
        oidcToken: devToken,
        allowDevBypass: true
      });

      expect(res.success).toBe(true);
      expect(res.claims).toBeDefined();
      expect(res.claims?.repository).toBe("oruvena/shipledger");
      expect(res.claims?.sha).toBe("1234567890abcdef1234567890abcdef12345678");
    });

    it("should reject OIDC mismatch when repo or commit SHA do not match bundle", async () => {
      const bundle = await createValidBundle();
      const wrongRepoToken = "dev-mock-token:other-org/other-repo;1234567890abcdef1234567890abcdef12345678";

      await expect(
        ingestEvidenceBundle({
          rawEvidence: bundle,
          oidcToken: wrongRepoToken,
          allowDevBypass: true
        })
      ).rejects.toThrow(/OIDC repository mismatch/);

      const wrongShaToken = "dev-mock-token:oruvena/shipledger;0000000000000000000000000000000000000000";

      await expect(
        ingestEvidenceBundle({
          rawEvidence: bundle,
          oidcToken: wrongShaToken,
          allowDevBypass: true
        })
      ).rejects.toThrow(/OIDC commit SHA mismatch/);
    });
  });

  describe("Risk Acceptance Decision API (Section 16)", () => {
    const fixedNow = new Date("2026-10-07T12:00:00Z");

    it("should record valid risk acceptance with future expiration", () => {
      const res = recordRiskDecision({
        findingId: "GHSA-xxxx-yyyy",
        reason: "False positive: vulnerable path is never invoked in CLI environment",
        approvedBy: "security-lead@oruvena.com",
        expiresAt: "2026-11-06T12:00:00Z",
        now: fixedNow
      });

      expect(res.decision.finding).toBe("GHSA-xxxx-yyyy");
      expect(res.decision.decision).toBe("RISK_ACCEPTED");
      expect(res.decision.approved_by).toBe("security-lead@oruvena.com");
      expect(res.audit.action).toBe("risk_accepted");
      expect(res.audit.resource).toBe("finding:GHSA-xxxx-yyyy");
    });

    it("should reject risk acceptance without reason or approver", () => {
      expect(() =>
        recordRiskDecision({
          findingId: "GHSA-xxxx-yyyy",
          reason: "   ",
          approvedBy: "security-lead",
          expiresAt: "2026-11-06T12:00:00Z",
          now: fixedNow
        })
      ).toThrow(/Risk acceptance reason is mandatory/);

      expect(() =>
        recordRiskDecision({
          findingId: "GHSA-xxxx-yyyy",
          reason: "Legitimate reason",
          approvedBy: "",
          expiresAt: "2026-11-06T12:00:00Z",
          now: fixedNow
        })
      ).toThrow(/Approver name\/ID is required/);
    });

    it("should reject expired or past expiration dates", () => {
      expect(() =>
        recordRiskDecision({
          findingId: "GHSA-xxxx-yyyy",
          reason: "Legitimate reason",
          approvedBy: "security-lead",
          expiresAt: "2026-10-05T12:00:00Z", // past date
          now: fixedNow
        })
      ).toThrow(/must be in the future/);
    });
  });

  describe("Human Release Approval API (Section 20)", () => {
    it("should allow human approval only when release status is READY", () => {
      const approval = recordHumanReleaseApproval({
        releaseId: "rel-001",
        currentStatus: "READY",
        approvedBy: "lead-dev@oruvena.com",
        comment: "QA testing passed, ready for production rollout"
      });

      expect(approval.previousStatus).toBe("READY");
      expect(approval.newStatus).toBe("APPROVED");
      expect(approval.approvedBy).toBe("lead-dev@oruvena.com");
    });

    it("should prohibit approval if status is REVIEW_REQUIRED or INCOMPLETE", () => {
      expect(() =>
        recordHumanReleaseApproval({
          releaseId: "rel-002",
          currentStatus: "REVIEW_REQUIRED",
          approvedBy: "lead-dev"
        })
      ).toThrow(/Only releases in 'READY' status can be approved/);

      expect(() =>
        recordHumanReleaseApproval({
          releaseId: "rel-003",
          currentStatus: "INCOMPLETE",
          approvedBy: "lead-dev"
        })
      ).toThrow(/Only releases in 'READY' status can be approved/);
    });
  });

  describe("Next.js Route Handler (POST /api/v1/evidence)", () => {
    it("should process evidence ingestion via HTTP route handler", async () => {
      const bundle = await createValidBundle();
      const req = new Request("http://localhost:3000/api/v1/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: bundle })
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.integrity.verified).toBe(true);
      expect(data.release.repository).toBe("oruvena/shipledger");
    });

    it("should return HTTP 400 when malformed evidence is posted", async () => {
      const req = new Request("http://localhost:3000/api/v1/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: { invalid: true } })
      });

      const res = await POST(req as any);
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});

