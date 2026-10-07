import React from "react";
import Link from "next/link";
import { StatusBadge } from "../components/StatusBadge";

export default function OverviewPage() {
  const metrics = [
    { label: "Connected Repositories", value: "3", change: "+1 this month" },
    { label: "Active Releases", value: "14", change: "Immutable bundles" },
    { label: "Review Required", value: "1", alert: true, change: "Action required" },
    { label: "Critical Findings", value: "0", status: "Clean" },
    { label: "Evidence Completeness", value: "96%", change: "+4% vs baseline" }
  ];

  const recentReleases = [
    {
      id: "rel-tobi-v0.8.3",
      repo: "oruvena/tobi",
      tag: "v0.8.3",
      sha: "4dbede7",
      status: "READY",
      components: 994,
      findings: 0,
      digest: "9102235c...a8bd",
      date: "2026-10-07 18:30"
    },
    {
      id: "rel-shipledger-v0.1.0",
      repo: "oruvena/shipledger",
      tag: "v0.1.0",
      sha: "16f6a87",
      status: "APPROVED",
      components: 14,
      findings: 0,
      digest: "c547de4c...d295",
      date: "2026-10-07 10:45"
    },
    {
      id: "rel-gateway-v2.1.0",
      repo: "oruvena/api-gateway",
      tag: "v2.1.0",
      sha: "88ab12e",
      status: "REVIEW_REQUIRED",
      components: 320,
      findings: 2,
      digest: "e90fa211...7710",
      date: "2026-10-06 21:15"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#11131a] p-6 rounded-xl border border-[#1e2230]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Release Evidence Overview
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time status of cryptographic evidence bundles, policy gates, and vulnerability history.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/repositories"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#1c202d] hover:bg-[#252a3d] text-white border border-[#2b3145] transition-colors"
          >
            Manage Repositories
          </Link>
          <Link
            href="/findings"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-colors"
          >
            Review Findings
          </Link>
        </div>
      </div>

      {/* Metric Cards (Section 30) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="bg-[#11131a] border border-[#1e2230] p-4 rounded-xl space-y-2"
          >
            <div className="text-xs text-gray-400 font-medium">{m.label}</div>
            <div className="text-2xl font-bold text-white flex items-baseline gap-2">
              {m.value}
              {m.alert && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <div className="text-[11px] text-gray-500">{m.change || m.status}</div>
          </div>
        ))}
      </div>

      {/* Recent Releases Table (Section 30) */}
      <div className="bg-[#11131a] border border-[#1e2230] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1e2230] flex justify-between items-center">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Releases</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Append-only audit trail ingested via GitHub Actions OIDC
            </p>
          </div>
          <span className="text-xs text-gray-400 font-mono">Showing 3 of 14 releases</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#161922] text-xs uppercase text-gray-400 font-semibold border-b border-[#1e2230]">
              <tr>
                <th className="px-5 py-3">Repository & Tag</th>
                <th className="px-5 py-3">Commit</th>
                <th className="px-5 py-3">Gate Status</th>
                <th className="px-5 py-3">SBOM Items</th>
                <th className="px-5 py-3">Findings</th>
                <th className="px-5 py-3">Evidence Digest</th>
                <th className="px-5 py-3">Ingested At</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2230]">
              {recentReleases.map((rel) => (
                <tr key={rel.id} className="hover:bg-[#151821] transition-colors">
                  <td className="px-5 py-4 font-medium text-white flex items-center gap-2">
                    <span>{rel.repo}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                      {rel.tag}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-gray-300">{rel.sha}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={rel.status} />
                  </td>
                  <td className="px-5 py-4 text-gray-300 font-mono text-xs">
                    {rel.components} components
                  </td>
                  <td className="px-5 py-4">
                    {rel.findings === 0 ? (
                      <span className="text-emerald-400 text-xs">0 (Clean)</span>
                    ) : (
                      <span className="text-amber-400 text-xs font-semibold">
                        {rel.findings} findings
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-gray-400">
                    {rel.digest}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">{rel.date}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/releases/${rel.id}`}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Inspect Vault &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
