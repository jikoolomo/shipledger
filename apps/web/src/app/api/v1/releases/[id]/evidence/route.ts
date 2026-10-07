import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Returns immutable Release Evidence Bundle JSON (Section 11, 27)
  const rawBundle = {
    schema_version: "shipledger.evidence.v1",
    release: {
      repository: "oruvena/tobi",
      commit_sha: "4dbede734f06f7607337839212d38242401d936d",
      tag: "v0.8.3",
      created_at: "2026-10-07T18:30:00Z"
    },
    source: {
      branch: "main",
      actor: "release-bot",
      trigger: "release"
    },
    artifacts: [],
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
      component_count: 994,
      components: []
    },
    vulnerabilities: [],
    changes: {},
    policy: {
      profile: "cra-readiness",
      status: "READY",
      checks: [],
      evaluated_at: "2026-10-07T18:30:00Z"
    },
    risk_decisions: [],
    approvals: [],
    integrity: {
      algorithm: "sha256",
      evidence_digest: "9102235c7d6797f88c0ff0d16419cfbe3fe757fb5e30c04460974fd8425d3fb0"
    }
  };

  return NextResponse.json({
    release_id: id,
    evidence_digest: rawBundle.integrity.evidence_digest,
    bundle: rawBundle
  });
}
