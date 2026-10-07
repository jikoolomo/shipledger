import React from "react";
import { StatusBadge } from "../../components/StatusBadge";

export default function FindingsPage() {
  const findings = [
    {
      id: "GHSA-78v5-q3q3-92f5",
      cve: "CVE-2024-38526",
      package: "urllib3",
      version: "1.26.18",
      severity: "HIGH",
      status: "RISK_ACCEPTED",
      repository: "oruvena/api-gateway",
      summary: "Proxy-Authorization header leakage during cross-origin redirect",
      risk_acceptance: {
        reason: "Gateway handles private internal network calls only, redirects disabled",
        approved_by: "sec-admin@oruvena.com",
        expires_at: "2026-11-06T12:00:00Z"
      }
    },
    {
      id: "GHSA-g954-5hwp-ppxv",
      cve: "CVE-2024-21538",
      package: "nanoid",
      version: "3.3.7",
      severity: "MEDIUM",
      status: "OPEN",
      repository: "oruvena/api-gateway",
      summary: "Predictable token collision in high throughput generator",
      risk_acceptance: null
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#11131a] p-6 rounded-xl border border-[#1e2230]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security Findings & Risk Decisions</h1>
          <p className="text-sm text-gray-400 mt-1">
            Aggregated vulnerability findings from OSV and CycloneDX across all tracked releases.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-[#1c202d] border border-[#2b3145] text-gray-300 font-medium">
            Active Findings: <strong className="text-white">2</strong>
          </span>
          <span className="text-xs px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-300 font-medium">
            Risk Accepted: <strong className="text-purple-200">1</strong>
          </span>
        </div>
      </div>

      <div className="bg-[#11131a] border border-[#1e2230] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1e2230] flex justify-between items-center">
          <h2 className="text-base font-semibold text-white">Vulnerability Catalog</h2>
          <div className="flex gap-2 text-xs">
            <button className="px-3 py-1 rounded bg-[#1c202d] text-white border border-[#2b3145]">All</button>
            <button className="px-3 py-1 rounded bg-transparent text-gray-400 hover:text-white">Open</button>
            <button className="px-3 py-1 rounded bg-transparent text-gray-400 hover:text-white">Risk Accepted</button>
          </div>
        </div>

        <div className="divide-y divide-[#1e2230]">
          {findings.map((finding) => (
            <div key={finding.id} className="p-5 space-y-3 hover:bg-[#151821] transition-colors">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white font-mono">{finding.id}</span>
                  {finding.cve && (
                    <span className="text-xs text-gray-400 font-mono">({finding.cve})</span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      finding.severity === "HIGH"
                        ? "bg-amber-950/80 text-amber-400 border border-amber-800"
                        : "bg-blue-950/80 text-blue-400 border border-blue-800"
                    }`}
                  >
                    {finding.severity}
                  </span>
                </div>
                <StatusBadge status={finding.status} size="sm" />
              </div>

              <div className="text-sm text-gray-300">
                Package: <code className="text-white bg-[#1c202d] px-1.5 py-0.5 rounded">{finding.package}@{finding.version}</code> &bull; Repo: <span className="text-gray-400">{finding.repository}</span>
              </div>
              <div className="text-xs text-gray-400">{finding.summary}</div>

              {finding.risk_acceptance && (
                <div className="bg-[#1a1528] p-3 rounded-lg border border-purple-900/60 text-xs space-y-1">
                  <div className="font-semibold text-purple-300 flex items-center gap-2">
                    <span>Human Risk Decision (Section 16 Audit)</span>
                    <span className="text-[10px] text-purple-400 font-normal">
                      Expires: {new Date(finding.risk_acceptance.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-purple-200">
                    Reason: &ldquo;{finding.risk_acceptance.reason}&rdquo;
                  </div>
                  <div className="text-purple-400 text-[11px]">
                    Approved by: {finding.risk_acceptance.approved_by}
                  </div>
                </div>
              )}

              {finding.status === "OPEN" && (
                <div className="pt-2 flex justify-end">
                  <button className="px-3 py-1.5 text-xs font-semibold rounded bg-[#252a3d] hover:bg-purple-900/80 text-white border border-[#3b4260] transition-colors">
                    + Record Human Risk Acceptance
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
