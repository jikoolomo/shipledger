import { describe, expect, it } from "vitest";
import {
  generateCraIncidentDossier,
  monitorReleaseVulnerabilities,
  renderCraDossierMarkdown
} from "../packages/core/src/index.js";
import { preparePersistenceData } from "../packages/api/src/index.js";
import type { ReleaseEvidenceBundle, VulnerabilityFinding } from "@shipledger/schema";

const mockBundle: ReleaseEvidenceBundle = {
  schema_version: "shipledger.evidence.v1",
  release: {
    repository: "oruvena/tobi",
    commit_sha: "4dbede734f06f7607337839212d38242401d936d",
    tag: "v0.8.3",
    workflow_run_id: "37624483531",
    created_at: "2026-10-07T12:00:00Z"
  },
  source: {
    branch: "main",
    actor: "release-bot",
    trigger: "release"
  },
  artifacts: [
    {
      name: "tobi.zip",
      path: "dist/tobi.zip",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      size: 1024,
      created_at: "2026-10-07T12:00:00Z"
    }
  ],
  tests: {
    status: "PASSED",
    passed: 20,
    failed: 0,
    skipped: 0,
    total: 20,
    reports: ["junit.xml"]
  },
  sbom: {
    status: "VERIFIED",
    format: "CycloneDX",
    component_count: 3,
    components: [
      { name: "express", version: "4.18.2", purl: "pkg:npm/express@4.18.2" },
      { name: "lodash", version: "4.17.21", purl: "pkg:npm/lodash@4.17.21" },
      { name: "axios", version: "1.6.0", purl: "pkg:npm/axios@1.6.0" }
    ]
  },
  vulnerabilities: [
    {
      id: "GHSA-old-vuln-001",
      package_name: "express",
      package_version: "4.18.2",
      severity: "LOW",
      status: "OPEN",
      aliases: [],
      known_exploited: false
    }
  ],
  changes: {},
  policy: {
    profile: "cra-readiness",
    status: "READY",
    checks: [],
    evaluated_at: "2026-10-07T12:00:00Z"
  },
  risk_decisions: [],
  approvals: [],
  integrity: {
    algorithm: "sha256",
    evidence_digest: "9102235c7d6797f88c0ff0d16419cfbe3fe757fb5e30c04460974fd8425d3fb0"
  }
};

describe("Continuous Vulnerability Monitoring Engine (Section 41 & 42)", () => {
  it("should report no potential security events when no new vulnerabilities exist", async () => {
    const result = await monitorReleaseVulnerabilities({
      bundle: mockBundle,
      osvFindingsFetcher: async () => [
        // Only return the already known vulnerability
        {
          id: "GHSA-old-vuln-001",
          package_name: "express",
          package_version: "4.18.2",
          severity: "LOW",
          status: "OPEN",
          aliases: [],
          known_exploited: false
        }
      ]
    });

    expect(result.has_potential_security_event).toBe(false);
    expect(result.alert).toBeNull();
    expect(result.new_findings).toHaveLength(0);
    expect(result.markdownReport).toContain("No newly discovered vulnerabilities");
  });

  it("should detect new vulnerabilities and emit POTENTIAL SECURITY EVENT without asserting CRA compliance/reports (§42)", async () => {
    const newlyDiscoveredFinding: VulnerabilityFinding = {
      id: "CVE-2026-9999",
      package_name: "axios",
      package_version: "1.6.0",
      severity: "CRITICAL",
      summary: "Severe RCE in Axios parser discovered post-release",
      status: "REVIEW_REQUIRED",
      aliases: ["GHSA-new-cve-9999"],
      known_exploited: true
    };

    const result = await monitorReleaseVulnerabilities({
      bundle: mockBundle,
      osvFindingsFetcher: async () => [
        {
          id: "GHSA-old-vuln-001",
          package_name: "express",
          package_version: "4.18.2",
          severity: "LOW",
          status: "OPEN",
          aliases: [],
          known_exploited: false
        },
        newlyDiscoveredFinding
      ]
    });

    expect(result.has_potential_security_event).toBe(true);
    // Strict requirement (§42): Must be "POTENTIAL SECURITY EVENT: Human review required"
    expect(result.alert).toBe("POTENTIAL SECURITY EVENT: Human review required");
    // Strict anti-goal (§42): Never say "CRA REPORT REQUIRED"
    expect(result.alert).not.toContain("CRA REPORT REQUIRED");
    expect(result.markdownReport).not.toContain("CRA REPORT REQUIRED");

    expect(result.new_findings).toHaveLength(1);
    expect(result.new_findings[0].id).toBe("CVE-2026-9999");
    expect(result.critical_new_count).toBe(1);
  });
});

describe("CRA Article 14 Incident Dossier Generator (Section 43~46)", () => {
  const fixedNow = new Date("2026-10-07T12:00:00Z");
  const confirmedAwareness = "2026-10-07T10:00:00Z"; // 2 hours prior to now

  it("should calculate exact 24h Early Warning and 72h Notification deadlines from confirmed awareness time (§44, §45)", () => {
    const dossier = generateCraIncidentDossier({
      bundle: mockBundle,
      findingId: "CVE-2026-9999",
      incidentType: "ACTIVELY_EXPLOITED_VULNERABILITY",
      confirmedAwarenessTime: confirmedAwareness,
      confirmedBy: "sec-officer@oruvena.com",
      impactSummary: "Exploitation verified in client sandbox",
      mitigationStatus: "Patch v0.8.4 in testing",
      now: fixedNow
    });

    expect(dossier.schema_version).toBe("shipledger.cra_dossier.v1");
    expect(dossier.human_confirmation.confirmed_by).toBe("sec-officer@oruvena.com");
    expect(dossier.regulatory_timeline.awareness_time).toBe("2026-10-07T10:00:00.000Z");

    // Early warning deadline: 2026-10-07T10:00:00Z + 24h = 2026-10-08T10:00:00Z
    expect(dossier.regulatory_timeline.early_warning_deadline_24h).toBe("2026-10-08T10:00:00.000Z");
    // Remaining hours: 24h - 2h elapsed = 22.0h
    expect(dossier.regulatory_timeline.early_warning_remaining_hours).toBe(22);

    // Full notification deadline: 2026-10-07T10:00:00Z + 72h = 2026-10-10T10:00:00Z
    expect(dossier.regulatory_timeline.full_notification_deadline_72h).toBe("2026-10-10T10:00:00.000Z");
    // Remaining hours: 72h - 2h elapsed = 70.0h
    expect(dossier.regulatory_timeline.full_notification_remaining_hours).toBe(70);

    expect(dossier.regulatory_timeline.platform).toBe("ENISA Single Reporting Platform (SRP)");
  });

  it("should render compliant Markdown export dossier report (§46)", () => {
    const dossier = generateCraIncidentDossier({
      bundle: mockBundle,
      findingId: "GHSA-old-vuln-001",
      incidentType: "SEVERE_SECURITY_INCIDENT",
      confirmedAwarenessTime: confirmedAwareness,
      confirmedBy: "lead@oruvena.com",
      now: fixedNow
    });

    const markdown = renderCraDossierMarkdown(dossier);
    expect(markdown).toContain("EU Cyber Resilience Act (CRA Article 14) Incident Dossier");
    expect(markdown).toContain("ENISA Single Reporting Platform (SRP)");
    expect(markdown).toContain("24-Hour Early Warning Deadline");
    expect(markdown).toContain("72-Hour Full Notification Deadline");
    expect(markdown).toContain("lead@oruvena.com");
  });

  it("should require confirmedBy actor for legal accountability (§44)", () => {
    expect(() =>
      generateCraIncidentDossier({
        bundle: mockBundle,
        findingId: "CVE-2026-9999",
        incidentType: "ACTIVELY_EXPLOITED_VULNERABILITY",
        confirmedAwarenessTime: confirmedAwareness,
        confirmedBy: ""
      })
    ).toThrow(/Human confirmation actor/);
  });
});

describe("Drizzle ORM Evidence Persistence Adapter (Section 39 & 40)", () => {
  it("should transform evidence bundle into relational entity records", () => {
    const prepared = preparePersistenceData({
      bundle: mockBundle,
      repositoryId: "repo-uuid-1",
      organizationId: "org-uuid-1",
      productId: "prod-uuid-1",
      actorUserId: "user-uuid-1"
    });

    expect(prepared.release.repositoryId).toBe("repo-uuid-1");
    expect(prepared.release.commitSha).toBe(mockBundle.release.commit_sha);
    expect(prepared.release.evidenceDigest).toBe(mockBundle.integrity.evidence_digest);
    expect(prepared.evidenceBundle.digest).toBe(mockBundle.integrity.evidence_digest);
    expect(prepared.artifacts).toHaveLength(1);
    expect(prepared.artifacts[0].name).toBe("tobi.zip");
    expect(prepared.sbom.componentCount).toBe(3);
    expect(prepared.components).toHaveLength(3);
    expect(prepared.vulnerabilities).toHaveLength(1);
    expect(prepared.vulnerabilities[0].id).toBe("GHSA-old-vuln-001");
    expect(prepared.findings).toHaveLength(1);
    expect(prepared.auditEvent.action).toBe("evidence_ingested");
  });
});
