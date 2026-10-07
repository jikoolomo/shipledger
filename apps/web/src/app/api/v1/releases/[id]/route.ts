import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return NextResponse.json({
    id,
    repository: "oruvena/tobi",
    version: "v0.8.3",
    tag: "v0.8.3",
    commit_sha: "4dbede734f06f7607337839212d38242401d936d",
    workflow_run_id: "37624483531",
    status: "READY",
    evidence_digest: "9102235c7d6797f88c0ff0d16419cfbe3fe757fb5e30c04460974fd8425d3fb0",
    profile: "cra-readiness",
    created_at: "2026-10-07T18:30:00Z",
    completeness: {
      passed: 6,
      total: 6,
      percentage: "100%"
    }
  });
}
