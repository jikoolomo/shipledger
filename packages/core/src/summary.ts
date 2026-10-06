import type { ReleaseEvidenceBundle } from "@shipledger/schema";

export function generateMarkdownSummary(bundle: ReleaseEvidenceBundle, productName?: string): string {
  const { release, artifacts, tests, sbom, vulnerabilities, policy, integrity } = bundle;
  const name = productName || release.repository;
  const version = release.tag || release.commit_sha.substring(0, 7);

  const criticalCount = vulnerabilities.filter(v => v.severity === "CRITICAL" && v.status !== "FIXED" && v.status !== "RISK_ACCEPTED").length;
  const highCount = vulnerabilities.filter(v => v.severity === "HIGH" && v.status !== "FIXED" && v.status !== "RISK_ACCEPTED").length;
  const knownExploitedCount = vulnerabilities.filter(v => v.known_exploited).length;

  const passedChecks = policy.checks.filter(c => c.passed).length;
  const totalChecks = policy.checks.length;

  let statusBadge = "🟢 **READY**";
  if (policy.status === "REVIEW_REQUIRED") {
    statusBadge = "🟡 **REVIEW REQUIRED**";
  } else if (policy.status === "INCOMPLETE") {
    statusBadge = "🔴 **INCOMPLETE**";
  }

  const lines: string[] = [];

  lines.push(`# ShipLedger`);
  lines.push(`### **${name} ${version}**`);
  lines.push("");

  // Release Identity
  lines.push(`#### 📌 Release Identity`);
  lines.push(`- ✓ Commit pinned: \`${release.commit_sha.substring(0, 7)}\``);
  if (artifacts.length > 0) {
    lines.push(`- ✓ Artifact hashes generated: **${artifacts.length} file(s)**`);
  } else {
    lines.push(`- ℹ No binary artifacts configured`);
  }
  lines.push("");

  // Tests
  lines.push(`#### 🧪 Tests`);
  if (tests.status === "MISSING") {
    lines.push(`- ⚠ Test reports missing`);
  } else if (tests.status === "FAILED") {
    lines.push(`- ❌ **${tests.failed} failed**, ${tests.passed} passed (${tests.total} total)`);
  } else {
    lines.push(`- ✓ **${tests.passed} passed**, 0 failed`);
  }
  lines.push("");

  // SBOM
  lines.push(`#### 📦 SBOM`);
  if (sbom.status === "VERIFIED") {
    lines.push(`- ✓ **${sbom.format}** (${sbom.component_count} components)`);
  } else if (sbom.status === "MISSING") {
    lines.push(`- ⚠ Evidence Missing: SBOM not found`);
  } else {
    lines.push(`- ❌ SBOM Invalid or corrupted`);
  }
  lines.push("");

  // Security Findings
  lines.push(`#### 🛡 Security Findings`);
  lines.push(`- ${criticalCount === 0 ? "✓" : "❌"} **${criticalCount} critical**`);
  lines.push(`- ${highCount === 0 ? "✓" : "⚠"} **${highCount} high**`);
  lines.push(`- ${knownExploitedCount === 0 ? "✓" : "❌"} **${knownExploitedCount} known exploited**`);
  lines.push("");

  // Policy Checks Summary
  lines.push(`#### 📋 Evidence Completeness`);
  lines.push(`**${passedChecks} / ${totalChecks} complete**`);
  lines.push("");
  for (const check of policy.checks) {
    const icon = check.passed ? "✓" : (check.status === "INCOMPLETE" ? "🔴" : "🟡");
    lines.push(`- ${icon} ${check.message}`);
  }
  lines.push("");

  // Status Box
  lines.push(`---`);
  lines.push(`### 🏁 Release Status`);
  lines.push(statusBadge);
  lines.push("");
  lines.push(`*Evidence Digest: \`${integrity.evidence_digest.substring(0, 16)}...\`*`);

  return lines.join("\n");
}
