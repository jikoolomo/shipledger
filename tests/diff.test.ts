import { describe, expect, it } from "vitest";
import { computeReleaseDiff, formatReleaseDiffMarkdown } from "../packages/core/src/diff.js";
import type { ReleaseEvidenceBundle } from "../packages/schema/src/index.js";

const createMockBundle = (overrides: Partial<ReleaseEvidenceBundle> = {}): ReleaseEvidenceBundle => {
  return {
    schema_version: "shipledger.evidence.v1",
    release: {
      repository: "oruvena/tobi",
      commit_sha: "1111111111111111111111111111111111111111",
      tag: "v0.8.2",
      created_at: "2026-10-01T00:00:00Z"
    },
    source: { branch: "main", actor: "dev", trigger: "release" },
    artifacts: [{ name: "tobi.zip", path: "dist/tobi.zip", sha256: "aaaa", size: 100, created_at: "2026-10-01T00:00:00Z" }],
    tests: { status: "PASSED", passed: 10, failed: 0, skipped: 0, total: 10, reports: [] },
    sbom: {
      status: "VERIFIED",
      format: "CycloneDX",
      component_count: 2,
      components: [
        { name: "package-a", version: "1.0.0" },
        { name: "package-b", version: "2.0.0" }
      ]
    },
    vulnerabilities: [
      { id: "CVE-2026-0001", package_name: "package-a", package_version: "1.0.0", severity: "HIGH", status: "OPEN", aliases: [], known_exploited: false }
    ],
    changes: {},
    policy: { profile: "baseline", status: "REVIEW_REQUIRED", checks: [], evaluated_at: "2026-10-01T00:00:00Z" },
    risk_decisions: [],
    approvals: [],
    integrity: { algorithm: "sha256", evidence_digest: "digest1" },
    ...overrides
  };
};

describe("Release Diff Engine (Section 29)", () => {
  it("should detect added, removed, and updated dependencies", () => {
    const prev = createMockBundle();
    const curr = createMockBundle({
      release: {
        repository: "oruvena/tobi",
        commit_sha: "2222222222222222222222222222222222222222",
        tag: "v0.8.3",
        created_at: "2026-10-06T00:00:00Z"
      },
      sbom: {
        status: "VERIFIED",
        format: "CycloneDX",
        component_count: 2,
        components: [
          { name: "package-a", version: "1.2.0" }, // updated
          { name: "package-c", version: "3.0.0" }  // added (package-b removed)
        ]
      }
    });

    const diff = computeReleaseDiff(prev, curr);

    expect(diff.dependencies.added).toEqual([{ name: "package-c", version: "3.0.0" }]);
    expect(diff.dependencies.removed).toEqual([{ name: "package-b", version: "2.0.0" }]);
    expect(diff.dependencies.updated).toEqual([{ name: "package-a", fromVersion: "1.0.0", toVersion: "1.2.0" }]);
  });

  it("should detect introduced and resolved vulnerabilities", () => {
    const prev = createMockBundle();
    const curr = createMockBundle({
      vulnerabilities: [
        // CVE-2026-0001 resolved
        { id: "CVE-2026-0002", package_name: "package-c", package_version: "3.0.0", severity: "CRITICAL", status: "OPEN", aliases: [], known_exploited: false }
      ]
    });

    const diff = computeReleaseDiff(prev, curr);

    expect(diff.security.resolved).toHaveLength(1);
    expect(diff.security.resolved[0].id).toBe("CVE-2026-0001");

    expect(diff.security.introduced).toHaveLength(1);
    expect(diff.security.introduced[0].id).toBe("CVE-2026-0002");
  });

  it("should compute test count deltas correctly", () => {
    const prev = createMockBundle({ tests: { status: "PASSED", passed: 10, failed: 1, skipped: 0, total: 11, reports: [] } });
    const curr = createMockBundle({ tests: { status: "PASSED", passed: 15, failed: 0, skipped: 0, total: 15, reports: [] } });

    const diff = computeReleaseDiff(prev, curr);

    expect(diff.tests.passedDiff).toBe(5);
    expect(diff.tests.failedDiff).toBe(-1);
    expect(diff.tests.totalDiff).toBe(4);
  });

  it("should format markdown diff properly", () => {
    const prev = createMockBundle();
    const curr = createMockBundle({
      release: { repository: "oruvena/tobi", commit_sha: "2222222222222222222222222222222222222222", tag: "v0.8.3", created_at: "2026-10-06T00:00:00Z" },
      policy: { profile: "baseline", status: "READY", checks: [], evaluated_at: "2026-10-06T00:00:00Z" }
    });

    const diff = computeReleaseDiff(prev, curr);
    const md = formatReleaseDiffMarkdown(diff);

    expect(md).toContain("ShipLedger Release Diff");
    expect(md).toContain("v0.8.2 → v0.8.3");
    expect(md).toContain("REVIEW_REQUIRED` ➔ `READY");
  });
});
