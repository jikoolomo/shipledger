import type { ReleaseEvidenceBundle } from "@shipledger/schema";
import {
  artifacts,
  auditEvents,
  components,
  evidenceBundles,
  findings,
  releases,
  sboms,
  vulnerabilities
} from "@shipledger/db";

export interface PreparedPersistenceData {
  release: typeof releases.$inferInsert;
  evidenceBundle: typeof evidenceBundles.$inferInsert;
  artifacts: Array<typeof artifacts.$inferInsert>;
  sbom: typeof sboms.$inferInsert;
  components: Array<typeof components.$inferInsert>;
  vulnerabilities: Array<typeof vulnerabilities.$inferInsert>;
  findings: Array<typeof findings.$inferInsert>;
  auditEvent: typeof auditEvents.$inferInsert;
}

export interface PreparePersistenceOptions {
  bundle: ReleaseEvidenceBundle;
  repositoryId: string;
  organizationId: string;
  productId?: string;
  actorUserId?: string;
}

/**
 * Transforms a ReleaseEvidenceBundle into Drizzle ORM entity records for PostgreSQL (Section 39, 40)
 */
export function preparePersistenceData(
  options: PreparePersistenceOptions
): PreparedPersistenceData {
  const { bundle, repositoryId, organizationId, productId, actorUserId } = options;

  const releaseId = crypto.randomUUID();
  const sbomId = crypto.randomUUID();

  // 1. Release Record
  const releaseRecord: typeof releases.$inferInsert = {
    id: releaseId,
    repositoryId,
    productId: productId || null,
    version: bundle.release.tag || bundle.release.commit_sha.substring(0, 7),
    commitSha: bundle.release.commit_sha,
    tag: bundle.release.tag || null,
    workflowRunId: bundle.release.workflow_run_id || null,
    status: (bundle.policy.status === "READY" ? "READY" : bundle.policy.status === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "INCOMPLETE") as any,
    evidenceDigest: bundle.integrity.evidence_digest,
    createdAt: new Date(bundle.release.created_at)
  };

  // 2. Evidence Bundle Record (Raw JSON + Digest)
  const bundleRecord: typeof evidenceBundles.$inferInsert = {
    id: crypto.randomUUID(),
    releaseId,
    schemaVersion: bundle.schema_version,
    digest: bundle.integrity.evidence_digest,
    rawBundleJson: bundle as any,
    createdAt: new Date()
  };

  // 3. Artifacts
  const artifactRecords: Array<typeof artifacts.$inferInsert> = (bundle.artifacts || []).map(a => ({
    id: crypto.randomUUID(),
    releaseId,
    name: a.name,
    path: a.path,
    sha256: a.sha256,
    sizeBytes: a.size,
    createdAt: new Date(a.created_at)
  }));

  // 4. SBOM
  const sbomRecord: typeof sboms.$inferInsert = {
    id: sbomId,
    releaseId,
    format: bundle.sbom.format || "CycloneDX",
    specVersion: bundle.sbom.spec_version || null,
    sha256: bundle.sbom.sha256 || "0".repeat(64),
    componentCount: bundle.sbom.component_count || 0,
    createdAt: new Date()
  };

  // 5. Components
  const componentRecords: Array<typeof components.$inferInsert> = (bundle.sbom.components || []).map(c => ({
    id: crypto.randomUUID(),
    sbomId,
    name: c.name,
    version: c.version,
    purl: c.purl || null,
    type: c.type || null,
    license: c.license || null
  }));

  // Map components by name+version for finding linkage
  const compMap = new Map<string, string>();
  for (const c of componentRecords) {
    compMap.set(`${c.name}@${c.version}`, c.id!);
  }

  // 6. Vulnerabilities & Findings
  const vulnerabilityRecords: Array<typeof vulnerabilities.$inferInsert> = [];
  const findingRecords: Array<typeof findings.$inferInsert> = [];

  for (const v of bundle.vulnerabilities || []) {
    vulnerabilityRecords.push({
      id: v.id,
      summary: v.summary || null,
      details: v.details || null,
      severity: v.severity as any,
      knownExploited: v.known_exploited || false,
      discoveredAt: new Date()
    });

    const matchedCompId = compMap.get(`${v.package_name}@${v.package_version}`);
    findingRecords.push({
      id: crypto.randomUUID(),
      releaseId,
      vulnerabilityId: v.id,
      componentId: matchedCompId || null,
      status: v.status as any,
      createdAt: new Date()
    });
  }

  // 7. Append-Only Audit Event (Section 40)
  const auditEventRecord: typeof auditEvents.$inferInsert = {
    id: crypto.randomUUID(),
    organizationId,
    actorUserId: actorUserId || null,
    action: "evidence_ingested",
    resourceType: "release",
    resourceId: releaseId,
    beforeState: null,
    afterState: {
      repository: bundle.release.repository,
      commit_sha: bundle.release.commit_sha,
      evidence_digest: bundle.integrity.evidence_digest,
      status: bundle.policy.status
    },
    timestamp: new Date()
  };

  return {
    release: releaseRecord,
    evidenceBundle: bundleRecord,
    artifacts: artifactRecords,
    sbom: sbomRecord,
    components: componentRecords,
    vulnerabilities: vulnerabilityRecords,
    findings: findingRecords,
    auditEvent: auditEventRecord
  };
}
