import React from "react";
import Link from "next/link";
import { StatusBadge } from "../../components/StatusBadge";

export default function RepositoriesPage() {
  const repos = [
    {
      id: "repo-tobi",
      name: "oruvena/tobi",
      branch: "main",
      profile: "cra-readiness",
      releasesCount: 8,
      latestRelease: {
        tag: "v0.8.3",
        status: "READY",
        date: "2026-10-07"
      },
      evidenceCoverage: "100%",
      artifacts: 2
    },
    {
      id: "repo-shipledger",
      name: "oruvena/shipledger",
      branch: "main",
      profile: "baseline",
      releasesCount: 4,
      latestRelease: {
        tag: "v0.1.0",
        status: "APPROVED",
        date: "2026-10-07"
      },
      evidenceCoverage: "100%",
      artifacts: 2
    },
    {
      id: "repo-gateway",
      name: "oruvena/api-gateway",
      branch: "main",
      profile: "baseline",
      releasesCount: 2,
      latestRelease: {
        tag: "v2.1.0",
        status: "REVIEW_REQUIRED",
        date: "2026-10-06"
      },
      evidenceCoverage: "88%",
      artifacts: 1
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#11131a] p-6 rounded-xl border border-[#1e2230]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Connected Repositories</h1>
          <p className="text-sm text-gray-400 mt-1">
            Repositories with active ShipLedger GitHub Actions evidence generation.
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-colors">
          + Connect GitHub Repository
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="bg-[#11131a] border border-[#1e2230] rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-gray-700 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="font-semibold text-white text-base">{repo.name}</div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                  {repo.profile}
                </span>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <span>Branch: <code className="text-gray-300">{repo.branch}</code></span>
                <span>&bull;</span>
                <span>{repo.releasesCount} releases recorded</span>
              </div>
            </div>

            <div className="bg-[#161922] p-3 rounded-lg border border-[#1e2230] space-y-2">
              <div className="text-xs text-gray-400 font-medium">Latest Release</div>
              <div className="flex justify-between items-center">
                <div className="text-sm font-semibold text-white font-mono">
                  {repo.latestRelease.tag}
                </div>
                <StatusBadge status={repo.latestRelease.status} size="sm" />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-[#1e2230]">
              <span className="text-gray-400">Coverage: <strong className="text-emerald-400">{repo.evidenceCoverage}</strong></span>
              <Link
                href={`/releases/rel-tobi-v0.8.3`}
                className="font-medium text-blue-400 hover:text-blue-300"
              >
                View Evidence &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
