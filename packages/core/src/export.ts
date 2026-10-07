import type { ReleaseEvidenceBundle, VulnerabilityFinding } from "@shipledger/schema";

export type CraIncidentType =
  | "ACTIVELY_EXPLOITED_VULNERABILITY"
  | "SEVERE_SECURITY_INCIDENT"
  | "OTHER";

export interface CraIncidentDossierInput {
  bundle: ReleaseEvidenceBundle;
  findingId: string;
  incidentType: CraIncidentType;
  confirmedAwarenessTime: string; // ISO 8601 (Section 44)
  confirmedBy: string;
  securityContact?: string;
  impactSummary?: string;
  mitigationStatus?: string;
  now?: Date;
}

export interface CraIncidentDossier {
  schema_version: "shipledger.cra_dossier.v1";
  dossier_id: string;
  created_at: string;
  product: {
    repository: string;
    commit_sha: string;
    tag?: string;
    evidence_digest: string;
  };
  vulnerability: {
    id: string;
    package_name: string;
    package_version: string;
    severity: string;
    summary?: string;
    known_exploited: boolean;
  };
  incident: {
    incident_type: CraIncidentType;
    impact_summary: string;
    mitigation_status: string;
  };
  human_confirmation: {
    confirmed_by: string;
    awareness_time: string;
    disclaimer: string;
  };
  regulatory_timeline: {
    awareness_time: string;
    early_warning_deadline_24h: string;
    early_warning_remaining_hours: number;
    full_notification_deadline_72h: string;
    full_notification_remaining_hours: number;
    platform: string;
  };
  contact: {
    security_contact: string;
  };
}

/**
 * Generates an EU Cyber Resilience Act (CRA Article 14) Incident Dossier (Section 43~46)
 *
 * Prepares compliant export dossier for the ENISA Single Reporting Platform (SRP).
 * Enforces human awareness confirmation and 24h / 72h regulatory countdown calculation.
 */
export function generateCraIncidentDossier(
  input: CraIncidentDossierInput
): CraIncidentDossier {
  const {
    bundle,
    findingId,
    incidentType,
    confirmedAwarenessTime,
    confirmedBy,
    securityContact = "security@oruvena.com",
    impactSummary = "Pending detailed technical impact analysis",
    mitigationStatus = "Remediation patch under preparation",
    now = new Date()
  } = input;

  if (!confirmedBy || confirmedBy.trim().length === 0) {
    throw new Error("Human confirmation actor (confirmedBy) is required for CRA incident dossier (Section 44)");
  }

  const awarenessDate = new Date(confirmedAwarenessTime);
  if (isNaN(awarenessDate.getTime())) {
    throw new Error("Invalid confirmed awareness timestamp format");
  }

  // Find finding in bundle or fallback to minimal record
  const finding: VulnerabilityFinding | undefined = bundle.vulnerabilities.find(
    v => v.id === findingId
  );

  const vulnData = finding || {
    id: findingId,
    package_name: "unknown-package",
    package_version: "unknown-version",
    severity: "HIGH" as const,
    summary: `Vulnerability ${findingId} affecting release ${bundle.release.commit_sha.substring(0, 7)}`,
    known_exploited: incidentType === "ACTIVELY_EXPLOITED_VULNERABILITY",
    status: "REVIEW_REQUIRED" as const,
    aliases: []
  };

  // Regulatory timeline calculation: 24h Early Warning, 72h Full Notification (Section 45)
  const earlyWarningMs = awarenessDate.getTime() + 24 * 60 * 60 * 1000;
  const fullNotificationMs = awarenessDate.getTime() + 72 * 60 * 60 * 1000;

  const earlyWarningRemainingHours = Math.max(
    0,
    Math.round(((earlyWarningMs - now.getTime()) / (1000 * 60 * 60)) * 10) / 10
  );
  const fullNotificationRemainingHours = Math.max(
    0,
    Math.round(((fullNotificationMs - now.getTime()) / (1000 * 60 * 60)) * 10) / 10
  );

  const dossierId = `cra-${findingId.toLowerCase()}-${bundle.release.commit_sha.substring(0, 7)}`;

  return {
    schema_version: "shipledger.cra_dossier.v1",
    dossier_id: dossierId,
    created_at: now.toISOString(),
    product: {
      repository: bundle.release.repository,
      commit_sha: bundle.release.commit_sha,
      tag: bundle.release.tag,
      evidence_digest: bundle.integrity.evidence_digest
    },
    vulnerability: {
      id: vulnData.id,
      package_name: vulnData.package_name,
      package_version: vulnData.package_version,
      severity: vulnData.severity,
      summary: vulnData.summary,
      known_exploited: vulnData.known_exploited
    },
    incident: {
      incident_type: incidentType,
      impact_summary: impactSummary.trim(),
      mitigation_status: mitigationStatus.trim()
    },
    human_confirmation: {
      confirmed_by: confirmedBy.trim(),
      awareness_time: awarenessDate.toISOString(),
      disclaimer: "Human confirmed awareness time in accordance with CRA Article 14. Scanner detection timestamp is distinct from legal manufacturer awareness."
    },
    regulatory_timeline: {
      awareness_time: awarenessDate.toISOString(),
      early_warning_deadline_24h: new Date(earlyWarningMs).toISOString(),
      early_warning_remaining_hours: earlyWarningRemainingHours,
      full_notification_deadline_72h: new Date(fullNotificationMs).toISOString(),
      full_notification_remaining_hours: fullNotificationRemainingHours,
      platform: "ENISA Single Reporting Platform (SRP)"
    },
    contact: {
      security_contact: securityContact
    }
  };
}

/**
 * Renders formatted Markdown representation of a CRA Incident Dossier for audit review
 */
export function renderCraDossierMarkdown(dossier: CraIncidentDossier): string {
  const lines: string[] = [];
  lines.push(`# EU Cyber Resilience Act (CRA Article 14) Incident Dossier`);
  lines.push("");
  lines.push(`**Dossier ID:** \`${dossier.dossier_id}\`  `);
  lines.push(`**Generated At:** ${dossier.created_at}  `);
  lines.push(`**Official Target:** ${dossier.regulatory_timeline.platform}  `);
  lines.push("");

  lines.push(`## 1. Product & Release Identification`);
  lines.push(`- **Repository:** \`${dossier.product.repository}\``);
  lines.push(`- **Release Tag:** \`${dossier.product.tag || "N/A"}\``);
  lines.push(`- **Commit SHA:** \`${dossier.product.commit_sha}\``);
  lines.push(`- **Evidence Digest (SHA-256):** \`${dossier.product.evidence_digest}\``);
  lines.push("");

  lines.push(`## 2. Vulnerability Details`);
  lines.push(`- **Vulnerability ID:** \`${dossier.vulnerability.id}\``);
  lines.push(`- **Component:** \`${dossier.vulnerability.package_name}@${dossier.vulnerability.package_version}\``);
  lines.push(`- **Severity:** **${dossier.vulnerability.severity}**`);
  lines.push(`- **Actively Exploited:** ${dossier.vulnerability.known_exploited ? "YES" : "NO"}`);
  lines.push(`- **Summary:** ${dossier.vulnerability.summary || "N/A"}`);
  lines.push("");

  lines.push(`## 3. Incident Classification`);
  lines.push(`- **Incident Type:** \`${dossier.incident.incident_type}\``);
  lines.push(`- **Impact Summary:** ${dossier.incident.impact_summary}`);
  lines.push(`- **Mitigation Status:** ${dossier.incident.mitigation_status}`);
  lines.push("");

  lines.push(`## 4. Human Awareness & Regulatory Timers (Section 44 & 45)`);
  lines.push(`- **Confirmed Awareness Time:** \`${dossier.regulatory_timeline.awareness_time}\``);
  lines.push(`- **Confirmed By:** ${dossier.human_confirmation.confirmed_by}`);
  lines.push(`- **24-Hour Early Warning Deadline:** \`${dossier.regulatory_timeline.early_warning_deadline_24h}\` (${dossier.regulatory_timeline.early_warning_remaining_hours}h remaining)`);
  lines.push(`- **72-Hour Full Notification Deadline:** \`${dossier.regulatory_timeline.full_notification_deadline_72h}\` (${dossier.regulatory_timeline.full_notification_remaining_hours}h remaining)`);
  lines.push(`- **Security Contact:** \`${dossier.contact.security_contact}\``);
  lines.push("");
  lines.push(`> [!NOTE]`);
  lines.push(`> ${dossier.human_confirmation.disclaimer}`);

  return lines.join("\n");
}
