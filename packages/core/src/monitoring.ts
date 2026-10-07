import type { ReleaseEvidenceBundle, SbomComponent, VulnerabilityFinding } from "@shipledger/schema";
import { queryOsvForComponents } from "./osv.js";

export interface MonitorReleaseOptions {
  bundle: ReleaseEvidenceBundle;
  osvFindingsFetcher?: (components: SbomComponent[]) => Promise<VulnerabilityFinding[]>;
  now?: Date;
}

export interface MonitoringResult {
  monitored_at: string;
  release: {
    repository: string;
    commit_sha: string;
    tag?: string;
  };
  total_components_scanned: number;
  known_findings_count: number;
  new_findings: VulnerabilityFinding[];
  has_potential_security_event: boolean;
  alert: string | null;
  critical_new_count: number;
  high_new_count: number;
  new_findings_by_severity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    UNKNOWN: number;
  };
  markdownReport: string;
}

/**
 * Continuous Vulnerability Monitoring Engine (Specification Section 41 & 42)
 *
 * Periodically rescans SBOM components of past releases against vulnerability databases.
 * Stricts Rule (§42): Never claims "CRA REPORT REQUIRED"; emits "POTENTIAL SECURITY EVENT: Human review required".
 */
export async function monitorReleaseVulnerabilities(
  options: MonitorReleaseOptions
): Promise<MonitoringResult> {
  const { bundle, osvFindingsFetcher = queryOsvForComponents } = options;
  const now = options.now || new Date();

  const components = bundle.sbom.components || [];
  const latestFindings = await osvFindingsFetcher(components);

  // Map existing known findings in release bundle
  const knownFindingKeys = new Set<string>();
  for (const f of bundle.vulnerabilities) {
    knownFindingKeys.add(`${f.id}:${f.package_name}:${f.package_version}`);
  }

  // Detect newly discovered findings since release
  const newFindings = latestFindings.filter(
    f => !knownFindingKeys.has(`${f.id}:${f.package_name}:${f.package_version}`)
  );

  const hasEvent = newFindings.length > 0;

  const severityCounts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    UNKNOWN: 0
  };

  for (const f of newFindings) {
    if (f.severity in severityCounts) {
      severityCounts[f.severity as keyof typeof severityCounts]++;
    } else {
      severityCounts.UNKNOWN++;
    }
  }

  // Section 42 Mandatory phrasing
  const alert = hasEvent
    ? "POTENTIAL SECURITY EVENT: Human review required"
    : null;

  const repo = bundle.release.repository;
  const tag = bundle.release.tag || bundle.release.commit_sha.substring(0, 7);

  // Markdown Summary
  const lines: string[] = [];
  lines.push(`## 🛡️ ShipLedger Continuous Vulnerability Monitoring Report`);
  lines.push(`- **Target Release:** \`${repo}@${tag}\` (Commit: \`${bundle.release.commit_sha.substring(0, 7)}\`)`);
  lines.push(`- **Monitored At:** ${now.toISOString()}`);
  lines.push(`- **SBOM Components Scanned:** ${components.length}`);
  lines.push(`- **Prior Findings at Release:** ${bundle.vulnerabilities.length}`);
  lines.push("");

  if (hasEvent) {
    lines.push(`> [!WARNING]`);
    lines.push(`> **${alert}**`);
    lines.push(`> ${newFindings.length} new vulnerability finding(s) discovered in components since this version was released.`);
    lines.push("");
    lines.push(`### Newly Discovered Findings (${newFindings.length})`);
    lines.push(`| Severity | Vulnerability ID | Package | Version | Summary |`);
    lines.push(`|---|---|---|---|---|`);
    for (const f of newFindings) {
      lines.push(
        `| **${f.severity}** | \`${f.id}\` | \`${f.package_name}\` | \`${f.package_version}\` | ${f.summary || "No summary provided"} |`
      );
    }
    lines.push("");
    lines.push(`*Next Action: Human review and confirm awareness time (Section 44).*`);
  } else {
    lines.push(`> [!NOTE]`);
    lines.push(`> **No newly discovered vulnerabilities.** All ${components.length} components match the baseline established at release time.`);
  }

  return {
    monitored_at: now.toISOString(),
    release: {
      repository: bundle.release.repository,
      commit_sha: bundle.release.commit_sha,
      tag: bundle.release.tag
    },
    total_components_scanned: components.length,
    known_findings_count: bundle.vulnerabilities.length,
    new_findings: newFindings,
    has_potential_security_event: hasEvent,
    alert,
    critical_new_count: severityCounts.CRITICAL,
    high_new_count: severityCounts.HIGH,
    new_findings_by_severity: severityCounts,
    markdownReport: lines.join("\n")
  };
}
