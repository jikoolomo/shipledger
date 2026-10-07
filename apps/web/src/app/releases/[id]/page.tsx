import React from "react";
import Link from "next/link";
import { StatusBadge } from "../../../components/StatusBadge";

export default function ReleaseDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // Mock bundle detail based on real Tovi & ShipLedger dogfooding evidence
  const release = {
    id: "rel-tobi-v0.8.3",
    product: "Tobi",
    repository: "oruvena/tobi",
    tag: "v0.8.3",
    commit_sha: "4dbede734f06f7607337839212d38242401d936d",
    workflow_run_id: "37624483531",
    actor: "jikoolomo",
    branch: "main",
    created_at: "2026-10-07T18:30:00Z",
    status: "READY",
    evidence_digest: "9102235c7d6797f88c0ff0d16419cfbe3fe757fb5e30c04460974fd8425d3fb0",
    profile: "cra-readiness",
    matrix: [
      { name: "Release Identity (Commit)", status: "READY", note: "Pinned to immutable 4dbede7" },
      { name: "Build Artifact Hashes", status: "READY", note: "2 files SHA-256 computed" },
      { name: "Automated Tests", status: "READY", note: "10/10 tests passed (JUnit XML)" },
      { name: "SBOM Completeness", status: "READY", note: "994 components (CycloneDX 1.5)" },
      { name: "Vulnerability Scan (OSV)", status: "READY", note: "0 critical, 0 high findings" },
      { name: "CRA Applicability", status: "READY", note: "Declared: IN_SCOPE, contact set" }
    ],
    artifacts: [
      { name: "Tobi-0.8.3.dmg", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", size: "94.8 MB" },
      { name: "tobi-0.8.3.zip", sha256: "7b4c6e9198fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852ba11", size: "82.1 MB" }
    ],
    findings: [],
    diff: {
      added_components: 12,
      removed_components: 3,
      changed_components: 18,
      new_findings: 0
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Large Status Badge (Section 31) */}
      <div className="bg-[#11131a] p-6 rounded-xl border border-[#1e2230] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {release.repository}
            </h1>
            <span className="text-sm font-mono px-2.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
              {release.tag}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Immutable Release Evidence Vault Record &bull; Product: <strong className="text-gray-300">{release.product}</strong>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-400">Release Gate Decision</div>
            <div className="text-[11px] text-gray-500 font-mono">Deterministic Policy Engine</div>
          </div>
          <StatusBadge status={release.status} size="lg" />
        </div>
      </div>

      {/* Release Identity Cards (Section 10, 39) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#11131a] p-5 rounded-xl border border-[#1e2230]">
        <div>
          <div className="text-xs text-gray-500 font-medium">Commit SHA (Immutable)</div>
          <div className="text-sm font-mono text-gray-200 mt-1 truncate" title={release.commit_sha}>
            {release.commit_sha}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium">Workflow Run & Actor</div>
          <div className="text-sm font-mono text-gray-200 mt-1">
            #{release.workflow_run_id} by {release.actor}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium">Branch & Trigger</div>
          <div className="text-sm font-mono text-gray-200 mt-1">
            {release.branch} (release trigger)
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium">Timestamp</div>
          <div className="text-sm text-gray-200 mt-1">
            {new Date(release.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Evidence Matrix (Section 31) */}
      <div className="bg-[#11131a] border border-[#1e2230] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1e2230]">
          <h2 className="text-base font-semibold text-white">Evidence Verification Matrix</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Verified checklist evaluating profile: <code className="text-blue-400">{release.profile}</code>
          </p>
        </div>
        <div className="divide-y divide-[#1e2230]">
          {release.matrix.map((row, idx) => (
            <div key={idx} className="p-4 flex justify-between items-center hover:bg-[#151821] transition-colors">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">{row.name}</div>
                <div className="text-xs text-gray-400">{row.note}</div>
              </div>
              <StatusBadge status={row.status} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Artifacts & Hashes (Section 12) */}
      <div className="bg-[#11131a] border border-[#1e2230] rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white">Release Artifact Hashes (SHA-256)</h2>
        <div className="space-y-2">
          {release.artifacts.map((art, idx) => (
            <div key={idx} className="bg-[#161922] p-3 rounded-lg border border-[#1e2230] flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <div className="text-sm font-medium text-white">{art.name}</div>
                <div className="text-xs font-mono text-gray-400 mt-0.5 break-all">
                  SHA-256: {art.sha256}
                </div>
              </div>
              <div className="text-xs font-mono text-gray-400 self-start sm:self-center">
                {art.size}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Release Diff (Section 32) */}
      <div className="bg-[#11131a] border border-[#1e2230] rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-semibold text-white">Release Diff (vs previous v0.8.2)</h2>
            <p className="text-xs text-gray-400">Dependency and vulnerability mutations</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800">
            +12 added / -3 removed
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#161922] p-3 rounded-lg border border-[#1e2230]">
            <div className="text-xs text-gray-400">Added Components</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">+{release.diff.added_components}</div>
          </div>
          <div className="bg-[#161922] p-3 rounded-lg border border-[#1e2230]">
            <div className="text-xs text-gray-400">Removed Components</div>
            <div className="text-lg font-bold text-gray-300 mt-1">-{release.diff.removed_components}</div>
          </div>
          <div className="bg-[#161922] p-3 rounded-lg border border-[#1e2230]">
            <div className="text-xs text-gray-400">Upgraded Components</div>
            <div className="text-lg font-bold text-blue-400 mt-1">{release.diff.changed_components}</div>
          </div>
          <div className="bg-[#161922] p-3 rounded-lg border border-[#1e2230]">
            <div className="text-xs text-gray-400">New Vulnerabilities</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">0</div>
          </div>
        </div>
      </div>

      {/* Cryptographic Integrity & Digest Vault (Section 27) */}
      <div className="bg-[#11131a] border border-[#1e2230] rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-white">Cryptographic Integrity Digest (RFC 8785)</h2>
        <div className="p-3 bg-[#161922] rounded-lg border border-[#1e2230] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="font-mono text-xs text-emerald-400 break-all">
            {release.evidence_digest}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-semibold rounded bg-[#252a3d] hover:bg-[#323952] text-white transition-colors">
              Verify SHA-256
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              Download Evidence JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
