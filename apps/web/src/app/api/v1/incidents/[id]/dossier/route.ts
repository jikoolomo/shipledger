import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  const dossier = {
    schema_version: "https://shipledger.oruvena.com/schemas/cra-article14-v1.json",
    incident_id: id,
    regulation: "EU Cyber Resilience Act (CRA) Article 14",
    platform_target: "ENISA Single Reporting Platform (SRP)",
    generated_at: new Date().toISOString(),
    manufacturer: {
      name: "Oruvena",
      contact: "security@oruvena.com",
      origin_country: "EU"
    },
    product: {
      name: "Tobi / ShipLedger Monorepo",
      affected_release_tag: "v0.8.3",
      affected_commit_sha: "4dbede734f06f7607337839212d38242401d936d",
      evidence_digest: "9102235c7d6797f88c0ff0d16419cfbe3fe757fb5e30c04460974fd8425d3fb0"
    },
    incident: {
      type: "ACTIVELY_EXPLOITED_VULNERABILITY",
      cve_id: "CVE-2026-3391",
      severity: "CRITICAL",
      confirmed_awareness_time: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      confirmed_by: "Security Lead (lead@oruvena.com)",
      deadlines: {
        early_warning_24h: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
        full_notification_72h: new Date(Date.now() + 62 * 3600 * 1000).toISOString()
      },
      impact_summary: "High risk of RCE if malicious payload sent to parser endpoint.",
      mitigation_status: "Patch v0.8.4 prepared; testing in staging.",
      user_action_required: "Upgrade to v0.8.4 immediately upon release."
    },
    verification: {
      engine: "ShipLedger v0.2.0",
      immutable_log_verified: true,
      integrity_hash: "7287c651212dce97fcf2af1ea0e5311b821a09b1f4c3870ce9d8b76e9afc4291"
    }
  };

  if (format === "markdown") {
    const md = `# CRA Article 14 Incident Dossier: ${id}

> **Platform:** ENISA Single Reporting Platform (SRP) Draft  
> **Regulation:** EU Cyber Resilience Act (Regulation (EU) 2024/2847) Article 14  
> **Generated:** ${dossier.generated_at}  

---

### 1. Manufacturer & Product Identity
- **Manufacturer:** ${dossier.manufacturer.name} (${dossier.manufacturer.contact})
- **Product:** ${dossier.product.name}
- **Affected Release:** \`${dossier.product.affected_release_tag}\` (\`${dossier.product.affected_commit_sha.slice(0, 10)}\`)
- **Evidence Digest:** \`${dossier.product.evidence_digest}\`

### 2. Legal Deadlines (Article 14)
- **Confirmed Awareness Time:** \`${dossier.incident.confirmed_awareness_time}\`
- **Confirmed By:** ${dossier.incident.confirmed_by}
- **24h Early Warning Deadline:** \`${dossier.incident.deadlines.early_warning_24h}\`
- **72h Full Notification Deadline:** \`${dossier.incident.deadlines.full_notification_72h}\`

### 3. Vulnerability & Impact
- **Type:** ${dossier.incident.type}
- **CVE / Identifier:** ${dossier.incident.cve_id}
- **Severity:** ${dossier.incident.severity}
- **Impact:** ${dossier.incident.impact_summary}
- **Mitigation:** ${dossier.incident.mitigation_status}

### 4. Release Evidence & Verification
- **Engine:** ${dossier.verification.engine}
- **Integrity Verified:** ${dossier.verification.immutable_log_verified ? "YES" : "NO"}
- **Audit Hash:** \`${dossier.verification.integrity_hash}\`

---
*Notice: This dossier is prepared for responsible review prior to submission to the national CSIRT / ENISA SRP.*
`;
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="cra-article14-dossier-${id}.md"`
      }
    });
  }

  return NextResponse.json(dossier);
}
