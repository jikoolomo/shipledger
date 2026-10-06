import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../packages/policy/src/index.js";
import type {
  ArtifactEvidence,
  ReleaseIdentity,
  SbomEvidence,
  ShipledgerConfig,
  TestResults,
  VulnerabilityFinding
} from "../packages/schema/src/index.js";

const baseConfig: ShipledgerConfig = {
  schema: 1,
  mode: "advisory",
  product: { id: "tobi", name: "Tobi", version: "0.8.3" },
  profile: { type: "baseline" },
  evidence: {
    artifacts: ["dist/*.dmg"],
    sbom: { path: "sbom.cdx.json" },
    tests: { junit: ["junit.xml"] }
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

const validRelease: ReleaseIdentity = {
  repository: "oruvena/tobi",
  commit_sha: "9f83abc1234567890abcdef1234567890abcdef1",
  tag: "v0.8.3",
  workflow_run_id: "123456",
  created_at: "2026-10-06T12:00:00Z"
};

const validArtifacts: ArtifactEvidence[] = [
  {
    name: "Tobi-0.8.3.dmg",
    path: "dist/Tobi-0.8.3.dmg",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    size: 1024,
    created_at: "2026-10-06T12:00:00Z"
  }
];

const passingTests: TestResults = {
  status: "PASSED",
  passed: 42,
  failed: 0,
  skipped: 0,
  total: 42,
  reports: ["junit.xml"]
};

const verifiedSbom: SbomEvidence = {
  status: "VERIFIED",
  format: "CycloneDX",
  component_count: 10,
  components: []
};

describe("Policy Engine - Scenarios from Spec (Section 68)", () => {
  it("Scenario A: Clean release -> READY", () => {
    const policy = evaluatePolicy({
      config: baseConfig,
      release: validRelease,
      artifacts: validArtifacts,
      tests: passingTests,
      sbom: verifiedSbom,
      vulnerabilities: []
    });

    expect(policy.status).toBe("READY");
    expect(policy.checks.every(c => c.passed)).toBe(true);
    // Spec requirement: COMPLIANT state must NEVER exist
    expect((policy.status as string)).not.toBe("COMPLIANT");
  });

  it("Scenario B: SBOM missing -> INCOMPLETE", () => {
    const policy = evaluatePolicy({
      config: baseConfig,
      release: validRelease,
      artifacts: validArtifacts,
      tests: passingTests,
      sbom: { status: "MISSING", component_count: 0, components: [] },
      vulnerabilities: []
    });

    expect(policy.status).toBe("INCOMPLETE");
    const sbomCheck = policy.checks.find(c => c.check === "sbom_available");
    expect(sbomCheck?.passed).toBe(false);
    expect(sbomCheck?.status).toBe("INCOMPLETE");
  });

  it("Scenario C: Critical vulnerability -> REVIEW_REQUIRED", () => {
    const criticalVuln: VulnerabilityFinding = {
      id: "CVE-2026-9999",
      package_name: "vulnerable-lib",
      package_version: "1.0.0",
      severity: "CRITICAL",
      status: "OPEN",
      aliases: [],
      known_exploited: false
    };

    const policy = evaluatePolicy({
      config: baseConfig,
      release: validRelease,
      artifacts: validArtifacts,
      tests: passingTests,
      sbom: verifiedSbom,
      vulnerabilities: [criticalVuln]
    });

    expect(policy.status).toBe("REVIEW_REQUIRED");
    const vulnCheck = policy.checks.find(c => c.check === "vulnerability_critical");
    expect(vulnCheck?.passed).toBe(false);
  });

  it("Scenario D: Risk accepted within valid period -> READY", () => {
    const acceptedVuln: VulnerabilityFinding = {
      id: "CVE-2026-9999",
      package_name: "vulnerable-lib",
      package_version: "1.0.0",
      severity: "CRITICAL",
      status: "RISK_ACCEPTED",
      aliases: [],
      known_exploited: false,
      risk_acceptance: {
        reason: "Affected code path is unreachable in production build",
        approved_by: "Security Officer",
        created_at: "2026-10-01T00:00:00Z",
        expires_at: "2026-11-01T00:00:00Z"
      }
    };

    const policy = evaluatePolicy({
      config: baseConfig,
      release: validRelease,
      artifacts: validArtifacts,
      tests: passingTests,
      sbom: verifiedSbom,
      vulnerabilities: [acceptedVuln],
      now: new Date("2026-10-06T12:00:00Z") // before expiry
    });

    expect(policy.status).toBe("READY");
  });

  it("Scenario E: Acceptance expired -> REVIEW_REQUIRED", () => {
    const expiredVuln: VulnerabilityFinding = {
      id: "CVE-2026-9999",
      package_name: "vulnerable-lib",
      package_version: "1.0.0",
      severity: "CRITICAL",
      status: "RISK_ACCEPTED",
      aliases: [],
      known_exploited: false,
      risk_acceptance: {
        reason: "Temporary waiver",
        approved_by: "Security Officer",
        created_at: "2026-09-01T00:00:00Z",
        expires_at: "2026-10-01T00:00:00Z"
      }
    };

    const policy = evaluatePolicy({
      config: baseConfig,
      release: validRelease,
      artifacts: validArtifacts,
      tests: passingTests,
      sbom: verifiedSbom,
      vulnerabilities: [expiredVuln],
      now: new Date("2026-10-06T12:00:00Z") // after expiry (Oct 1)
    });

    expect(policy.status).toBe("REVIEW_REQUIRED");
    const expiryCheck = policy.checks.find(c => c.check === "risk_acceptance_validity");
    expect(expiryCheck?.passed).toBe(false);
  });
});
