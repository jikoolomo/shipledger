import { NextResponse } from "next/server";

export async function GET() {
  // Returns connected repositories with release health (Section 37)
  const repos = [
    {
      id: "repo-tobi",
      name: "oruvena/tobi",
      default_branch: "main",
      profile: "cra-readiness",
      releases_count: 8,
      latest_release: {
        tag: "v0.8.3",
        commit_sha: "4dbede734f06f7607337839212d38242401d936d",
        status: "READY",
        evidence_digest: "9102235c7d6797f88c0ff0d16419cfbe3fe757fb5e30c04460974fd8425d3fb0",
        created_at: "2026-10-07T18:30:00Z"
      }
    },
    {
      id: "repo-shipledger",
      name: "oruvena/shipledger",
      default_branch: "main",
      profile: "baseline",
      releases_count: 4,
      latest_release: {
        tag: "v0.1.0",
        commit_sha: "16f6a87f156f51695fbbf9d4c7b452ec4c84da6a",
        status: "APPROVED",
        evidence_digest: "c547de4c3d7de365eb2b28c4f71a5371d9f6a7e73edc75ebd6e06b6319b3d295",
        created_at: "2026-10-07T10:45:00Z"
      }
    }
  ];

  return NextResponse.json({
    repositories: repos,
    count: repos.length
  });
}
