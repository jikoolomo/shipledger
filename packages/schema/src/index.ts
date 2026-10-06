import { z } from "zod";

// --- Schema Version ---
export const SCHEMA_VERSION = "shipledger.evidence.v1" as const;

// --- Finding Status (Section 15: AI가 새로운 상태를 만들지 못함) ---
export const FindingStatusSchema = z.enum([
  "OPEN",
  "REVIEW_REQUIRED",
  "FIXED",
  "NOT_AFFECTED",
  "RISK_ACCEPTED"
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

// --- Evaluation / Release Status (Section 18 & 20) ---
// 절대 COMPLIANT라는 상태는 존재하면 안 됨!
export const EvaluationStatusSchema = z.enum([
  "READY",
  "REVIEW_REQUIRED",
  "INCOMPLETE"
]);
export type EvaluationStatus = z.infer<typeof EvaluationStatusSchema>;

export const ReleaseLifecycleStatusSchema = z.enum([
  "COLLECTING",
  "EVALUATING",
  "INCOMPLETE",
  "REVIEW_REQUIRED",
  "READY",
  "APPROVED",
  "RELEASED"
]);
export type ReleaseLifecycleStatus = z.infer<typeof ReleaseLifecycleStatusSchema>;

// --- CRA Applicability (Section 19) ---
export const CraApplicabilitySchema = z.enum([
  "UNKNOWN",
  "IN_SCOPE",
  "OUT_OF_SCOPE"
]);
export type CraApplicability = z.infer<typeof CraApplicabilitySchema>;

// --- Release Identity (Section 10) ---
export const ReleaseIdentitySchema = z.object({
  repository: z.string(),
  commit_sha: z.string().min(7),
  tag: z.string().optional(),
  workflow_run_id: z.string().optional(),
  created_at: z.string().datetime()
});
export type ReleaseIdentity = z.infer<typeof ReleaseIdentitySchema>;

// --- Source Context ---
export const SourceContextSchema = z.object({
  branch: z.string().optional(),
  actor: z.string().optional(),
  trigger: z.string().optional()
});
export type SourceContext = z.infer<typeof SourceContextSchema>;

// --- Artifact Evidence (Section 12) ---
export const ArtifactEvidenceSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha256: z.string().length(64),
  size: z.number().int().nonnegative(),
  created_at: z.string().datetime()
});
export type ArtifactEvidence = z.infer<typeof ArtifactEvidenceSchema>;

// --- Test Results (Section 11, 24) ---
export const TestResultsSchema = z.object({
  status: z.enum(["PASSED", "FAILED", "MISSING", "ERROR"]),
  passed: z.number().int().nonnegative().default(0),
  failed: z.number().int().nonnegative().default(0),
  skipped: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative().default(0),
  duration_seconds: z.number().nonnegative().optional(),
  reports: z.array(z.string()).default([])
});
export type TestResults = z.infer<typeof TestResultsSchema>;

// --- SBOM Metadata (Section 13) ---
export const SbomComponentSchema = z.object({
  name: z.string(),
  version: z.string(),
  purl: z.string().optional(),
  type: z.string().optional(),
  license: z.string().optional()
});
export type SbomComponent = z.infer<typeof SbomComponentSchema>;

export const SbomEvidenceSchema = z.object({
  status: z.enum(["VERIFIED", "MISSING", "INVALID"]),
  format: z.enum(["CycloneDX", "SPDX", "UNKNOWN"]).optional(),
  spec_version: z.string().optional(),
  file_path: z.string().optional(),
  sha256: z.string().length(64).optional(),
  component_count: z.number().int().nonnegative().default(0),
  components: z.array(SbomComponentSchema).default([])
});
export type SbomEvidence = z.infer<typeof SbomEvidenceSchema>;

// --- Vulnerability & Finding (Section 14, 15) ---
export const VulnerabilityFindingSchema = z.object({
  id: z.string(), // e.g. CVE-2024-XXXX or GHSA-XXXX
  package_name: z.string(),
  package_version: z.string(),
  ecosystem: z.string().optional(),
  purl: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]),
  summary: z.string().optional(),
  details: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  known_exploited: z.boolean().default(false),
  status: FindingStatusSchema,
  risk_acceptance: z.object({
    reason: z.string(),
    approved_by: z.string(),
    created_at: z.string().datetime(),
    expires_at: z.string().datetime()
  }).optional()
});
export type VulnerabilityFinding = z.infer<typeof VulnerabilityFindingSchema>;

// --- Risk Acceptance (Section 16) ---
export const RiskAcceptanceSchema = z.object({
  finding: z.string(),
  decision: z.literal("RISK_ACCEPTED"),
  reason: z.string().min(1),
  approved_by: z.string().min(1),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime()
});
export type RiskAcceptance = z.infer<typeof RiskAcceptanceSchema>;

// --- Policy Evaluation Details (Section 17, 18, 19) ---
export const PolicyCheckResultSchema = z.object({
  check: z.string(),
  passed: z.boolean(),
  status: EvaluationStatusSchema,
  message: z.string()
});
export type PolicyCheckResult = z.infer<typeof PolicyCheckResultSchema>;

export const PolicyEvaluationSchema = z.object({
  profile: z.enum(["baseline", "cra-readiness"]),
  status: EvaluationStatusSchema,
  checks: z.array(PolicyCheckResultSchema),
  evaluated_at: z.string().datetime()
});
export type PolicyEvaluation = z.infer<typeof PolicyEvaluationSchema>;

// --- Human Approval (Section 20, 21) ---
export const HumanApprovalSchema = z.object({
  approved_by: z.string(),
  timestamp: z.string().datetime(),
  comment: z.string().optional()
});
export type HumanApproval = z.infer<typeof HumanApprovalSchema>;

// --- Evidence Integrity (Section 27) ---
export const IntegritySchema = z.object({
  algorithm: z.literal("sha256"),
  evidence_digest: z.string().length(64)
});
export type Integrity = z.infer<typeof IntegritySchema>;

// --- Complete Evidence Bundle (Section 11) ---
export const ReleaseEvidenceBundleSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  release: ReleaseIdentitySchema,
  source: SourceContextSchema,
  artifacts: z.array(ArtifactEvidenceSchema).default([]),
  tests: TestResultsSchema,
  sbom: SbomEvidenceSchema,
  vulnerabilities: z.array(VulnerabilityFindingSchema).default([]),
  changes: z.record(z.any()).default({}),
  policy: PolicyEvaluationSchema,
  risk_decisions: z.array(RiskAcceptanceSchema).default([]),
  approvals: z.array(HumanApprovalSchema).default([]),
  integrity: IntegritySchema
});
export type ReleaseEvidenceBundle = z.infer<typeof ReleaseEvidenceBundleSchema>;

// --- Configuration File Schema (.shipledger.yml, Section 23) ---
export const ShipledgerConfigSchema = z.object({
  schema: z.literal(1).default(1),
  mode: z.enum(["advisory", "enforce"]).default("advisory"),
  product: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().optional(),
    manufacturer: z.string().optional()
  }),
  profile: z.object({
    type: z.enum(["baseline", "cra-readiness"]).default("baseline")
  }).default({ type: "baseline" }),
  evidence: z.object({
    sbom: z.object({
      path: z.string()
    }).optional(),
    tests: z.object({
      junit: z.array(z.string()).default([])
    }).optional(),
    artifacts: z.array(z.string()).default([])
  }).default({}),
  policy: z.object({
    vulnerability: z.object({
      block_critical: z.boolean().default(true),
      review_high: z.boolean().default(true),
      review_known_exploited: z.boolean().default(true)
    }).default({}),
    risk_acceptance: z.object({
      max_expiry_days: z.number().int().positive().default(30)
    }).default({})
  }).default({}),
  cra: z.object({
    applicability: CraApplicabilitySchema.default("UNKNOWN"),
    support_period: z.object({
      end: z.string().nullable().default(null)
    }).default({ end: null }),
    security_contact: z.string().email().optional(),
    technical_documentation_reference: z.string().optional()
  }).optional(),
  risk_acceptances: z.array(RiskAcceptanceSchema).default([]),
  cloud: z.object({
    upload: z.boolean().default(false)
  }).default({ upload: false })
});
export type ShipledgerConfig = z.infer<typeof ShipledgerConfigSchema>;
