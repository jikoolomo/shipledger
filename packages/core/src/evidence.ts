import { writeFile } from "node:fs/promises";
import path from "node:path";
import { computeEvidenceDigest, toCanonicalJson } from "@shipledger/crypto";
import { evaluatePolicy } from "@shipledger/policy";
import {
  SCHEMA_VERSION,
  type ArtifactEvidence,
  type ReleaseEvidenceBundle,
  type ReleaseIdentity,
  type RiskAcceptance,
  type SbomEvidence,
  type ShipledgerConfig,
  type SourceContext,
  type TestResults,
  type VulnerabilityFinding
} from "@shipledger/schema";
import { generateMarkdownSummary } from "./summary.js";

export interface BuildEvidenceOptions {
  config: ShipledgerConfig;
  release: ReleaseIdentity;
  source: SourceContext;
  artifacts: ArtifactEvidence[];
  tests: TestResults;
  sbom: SbomEvidence;
  vulnerabilities: VulnerabilityFinding[];
  now?: Date;
  outputDir?: string;
}

export interface BuildEvidenceResult {
  bundle: ReleaseEvidenceBundle;
  markdownSummary: string;
  evidenceJsonPath: string;
  evidenceMdPath: string;
  outputs: {
    status: string;
    evidence_path: string;
    evidence_digest: string;
    finding_count: number;
    critical_count: number;
    review_required: boolean;
  };
}

export async function buildEvidenceBundle(options: BuildEvidenceOptions): Promise<BuildEvidenceResult> {
  const { config, release, source, artifacts, tests, sbom, outputDir = process.cwd() } = options;
  const now = options.now || new Date();

  // 1. Risk Acceptance 적용 (Section 16: finding ID와 매칭)
  const configuredRiskAcceptances: RiskAcceptance[] = config.risk_acceptances || [];
  const riskMap = new Map<string, RiskAcceptance>();
  for (const ra of configuredRiskAcceptances) {
    riskMap.set(ra.finding, ra);
  }

  const processedVulns: VulnerabilityFinding[] = options.vulnerabilities.map(v => {
    const acceptance = riskMap.get(v.id);
    if (acceptance) {
      return {
        ...v,
        status: "RISK_ACCEPTED",
        risk_acceptance: {
          reason: acceptance.reason,
          approved_by: acceptance.approved_by,
          created_at: acceptance.created_at,
          expires_at: acceptance.expires_at
        }
      };
    }
    return v;
  });

  // 2. Deterministic Policy Evaluation (Section 17, 18, 19)
  const policy = evaluatePolicy({
    config,
    release,
    artifacts,
    tests,
    sbom,
    vulnerabilities: processedVulns,
    now
  });

  // 3. Prepare Preliminary Bundle for Digest Calculation
  const preliminaryBundle = {
    schema_version: SCHEMA_VERSION,
    release,
    source,
    artifacts,
    tests,
    sbom,
    vulnerabilities: processedVulns,
    changes: {},
    policy,
    risk_decisions: configuredRiskAcceptances,
    approvals: []
  };

  // 4. Deterministic Canonical Digest Calculation (Section 27)
  const evidenceDigest = computeEvidenceDigest(preliminaryBundle);

  // 5. Final Bundle with Integrity
  const finalBundle: ReleaseEvidenceBundle = {
    ...preliminaryBundle,
    integrity: {
      algorithm: "sha256",
      evidence_digest: evidenceDigest
    }
  };

  // 6. Generate Markdown Summary
  const markdownSummary = generateMarkdownSummary(finalBundle, config.product.name);

  // 7. Write Evidence Files
  const evidenceJsonPath = path.resolve(outputDir, "shipledger-evidence.json");
  const evidenceMdPath = path.resolve(outputDir, "shipledger-evidence.md");

  // Canonical JSON으로 파일 저장
  const canonicalJsonContent = toCanonicalJson(finalBundle);
  await writeFile(evidenceJsonPath, canonicalJsonContent, "utf-8");
  await writeFile(evidenceMdPath, markdownSummary, "utf-8");

  // 8. Prepare Action Outputs (Section 25)
  const criticalCount = processedVulns.filter(v => v.severity === "CRITICAL" && v.status !== "RISK_ACCEPTED").length;
  const reviewRequired = policy.status === "REVIEW_REQUIRED";

  return {
    bundle: finalBundle,
    markdownSummary,
    evidenceJsonPath,
    evidenceMdPath,
    outputs: {
      status: policy.status,
      evidence_path: evidenceJsonPath,
      evidence_digest: evidenceDigest,
      finding_count: processedVulns.length,
      critical_count: criticalCount,
      review_required: reviewRequired
    }
  };
}
