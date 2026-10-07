import React from "react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-[#11131a] p-6 rounded-xl border border-[#1e2230]">
        <h1 className="text-2xl font-bold text-white tracking-tight">Organization & CRA Settings</h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure GitHub integration, OIDC ingestion, and EU Cyber Resilience Act readiness parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GitHub OIDC Integration (Section 36) */}
        <div className="bg-[#11131a] border border-[#1e2230] rounded-xl p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">GitHub Actions OIDC Authentication</h2>
            <p className="text-xs text-gray-400">
              Zero-password cryptographic authentication via GitHub token.actions
            </p>
          </div>

          <div className="bg-[#161922] p-3 rounded-lg border border-[#1e2230] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">OIDC Audience:</span>
              <code className="text-blue-400 font-mono">https://shipledger.oruvena.com</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Ingestion Endpoint:</span>
              <code className="text-emerald-400 font-mono">/api/v1/evidence</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">GitHub Installation:</span>
              <span className="text-white font-medium">oruvena (Connected)</span>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            Releases push evidence directly from CI pipelines without static API secrets.
          </div>
        </div>

        {/* CRA Readiness Parameters (Section 19, 23) */}
        <div className="bg-[#11131a] border border-[#1e2230] rounded-xl p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">CRA Readiness Defaults</h2>
            <p className="text-xs text-gray-400">
              EU Cyber Resilience Act baseline policy controls
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-400 block mb-1">Organization Security Contact (Article 14)</label>
              <input
                type="email"
                disabled
                value="security@oruvena.com"
                className="w-full bg-[#161922] border border-[#1e2230] rounded-lg px-3 py-2 text-gray-200"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Default Product CRA Applicability</label>
              <input
                type="text"
                disabled
                value="IN_SCOPE"
                className="w-full bg-[#161922] border border-[#1e2230] rounded-lg px-3 py-2 text-gray-200"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Max Risk Acceptance Expiration Period</label>
              <input
                type="text"
                disabled
                value="30 days"
                className="w-full bg-[#161922] border border-[#1e2230] rounded-lg px-3 py-2 text-gray-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
