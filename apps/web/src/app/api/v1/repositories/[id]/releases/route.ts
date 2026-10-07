import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const mockReleases = [
    {
      id: "rel-001",
      repository_id: id,
      version: "v0.8.3",
      tag: "v0.8.3",
      commit_sha: "4dbede734f06f7607337839212d38242401d936d",
      status: "READY",
      evidence_digest: "9102235c7d6797f88c0ff0d16419cfbe3fe757fb5e30c04460974fd8425d3fb0",
      created_at: "2026-10-07T18:30:00Z"
    },
    {
      id: "rel-002",
      repository_id: id,
      version: "v0.8.2",
      tag: "v0.8.2",
      commit_sha: "3ca1098ef7162541890284729174019284719283",
      status: "APPROVED",
      evidence_digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      created_at: "2026-10-01T12:00:00Z"
    }
  ];

  return NextResponse.json({
    repository_id: id,
    releases: mockReleases,
    count: mockReleases.length
  });
}
