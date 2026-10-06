#!/usr/bin/env node

// packages/core/src/osv.ts
function normalizeSeverity(vuln) {
  const dbSeverity = vuln.database_specific?.severity?.toUpperCase();
  if (dbSeverity === "CRITICAL" || dbSeverity === "HIGH" || dbSeverity === "MEDIUM" || dbSeverity === "LOW") {
    return dbSeverity;
  }
  const cvss = vuln.severity?.find((s) => s.type === "CVSS_V3")?.score;
  if (cvss) {
    const scoreNum = parseFloat(cvss);
    if (!isNaN(scoreNum)) {
      if (scoreNum >= 9) return "CRITICAL";
      if (scoreNum >= 7) return "HIGH";
      if (scoreNum >= 4) return "MEDIUM";
      return "LOW";
    }
  }
  return "UNKNOWN";
}
async function queryOsvForComponents(components, timeoutMs = 8e3) {
  if (components.length === 0) {
    return [];
  }
  const queries = [];
  const queryComponentMap = [];
  for (const comp of components) {
    if (comp.purl) {
      queries.push({ package: { purl: comp.purl } });
      queryComponentMap.push(comp);
    } else if (comp.name && comp.version) {
      queries.push({
        package: { name: comp.name },
        version: comp.version
      });
      queryComponentMap.push(comp);
    }
  }
  if (queries.length === 0) {
    return [];
  }
  const BATCH_SIZE = 500;
  const findings = [];
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const chunkQueries = queries.slice(i, i + BATCH_SIZE);
    const chunkComps = queryComponentMap.slice(i, i + BATCH_SIZE);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch("https://api.osv.dev/v1/querybatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: chunkQueries }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn(`OSV batch query failed with status: ${res.status}`);
        continue;
      }
      const data = await res.json();
      data.results?.forEach((result, idx) => {
        if (!result.vulns || result.vulns.length === 0) return;
        const comp = chunkComps[idx];
        for (const vuln of result.vulns) {
          const severity = normalizeSeverity(vuln);
          findings.push({
            id: vuln.id,
            package_name: comp.name,
            package_version: comp.version,
            purl: comp.purl,
            severity,
            summary: vuln.summary,
            details: vuln.details,
            aliases: vuln.aliases || [],
            known_exploited: false,
            // v0.1: KEV enrichment can be hooked here
            status: severity === "CRITICAL" || severity === "HIGH" ? "REVIEW_REQUIRED" : "OPEN"
          });
        }
      });
    } catch (err) {
      console.warn("Error communicating with OSV API (fail-safe fallback):", err.message);
    }
  }
  const uniqueMap = /* @__PURE__ */ new Map();
  for (const f of findings) {
    const key = `${f.id}:${f.package_name}:${f.package_version}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, f);
    }
  }
  return Array.from(uniqueMap.values());
}

// packages/core/src/summary.ts
function generateMarkdownSummary(bundle, productName) {
  const { release, artifacts, tests, sbom, vulnerabilities, policy, integrity } = bundle;
  const name = productName || release.repository;
  const version = release.tag || release.commit_sha.substring(0, 7);
  const criticalCount = vulnerabilities.filter((v) => v.severity === "CRITICAL" && v.status !== "FIXED" && v.status !== "RISK_ACCEPTED").length;
  const highCount = vulnerabilities.filter((v) => v.severity === "HIGH" && v.status !== "FIXED" && v.status !== "RISK_ACCEPTED").length;
  const knownExploitedCount = vulnerabilities.filter((v) => v.known_exploited).length;
  const passedChecks = policy.checks.filter((c) => c.passed).length;
  const totalChecks = policy.checks.length;
  let statusBadge = "\u{1F7E2} **READY**";
  if (policy.status === "REVIEW_REQUIRED") {
    statusBadge = "\u{1F7E1} **REVIEW REQUIRED**";
  } else if (policy.status === "INCOMPLETE") {
    statusBadge = "\u{1F534} **INCOMPLETE**";
  }
  const lines = [];
  lines.push(`# ShipLedger`);
  lines.push(`### **${name} ${version}**`);
  lines.push("");
  lines.push(`#### \u{1F4CC} Release Identity`);
  lines.push(`- \u2713 Commit pinned: \`${release.commit_sha.substring(0, 7)}\``);
  if (artifacts.length > 0) {
    lines.push(`- \u2713 Artifact hashes generated: **${artifacts.length} file(s)**`);
  } else {
    lines.push(`- \u2139 No binary artifacts configured`);
  }
  lines.push("");
  lines.push(`#### \u{1F9EA} Tests`);
  if (tests.status === "MISSING") {
    lines.push(`- \u26A0 Test reports missing`);
  } else if (tests.status === "FAILED") {
    lines.push(`- \u274C **${tests.failed} failed**, ${tests.passed} passed (${tests.total} total)`);
  } else {
    lines.push(`- \u2713 **${tests.passed} passed**, 0 failed`);
  }
  lines.push("");
  lines.push(`#### \u{1F4E6} SBOM`);
  if (sbom.status === "VERIFIED") {
    lines.push(`- \u2713 **${sbom.format}** (${sbom.component_count} components)`);
  } else if (sbom.status === "MISSING") {
    lines.push(`- \u26A0 Evidence Missing: SBOM not found`);
  } else {
    lines.push(`- \u274C SBOM Invalid or corrupted`);
  }
  lines.push("");
  lines.push(`#### \u{1F6E1} Security Findings`);
  lines.push(`- ${criticalCount === 0 ? "\u2713" : "\u274C"} **${criticalCount} critical**`);
  lines.push(`- ${highCount === 0 ? "\u2713" : "\u26A0"} **${highCount} high**`);
  lines.push(`- ${knownExploitedCount === 0 ? "\u2713" : "\u274C"} **${knownExploitedCount} known exploited**`);
  lines.push("");
  lines.push(`#### \u{1F4CB} Evidence Completeness`);
  lines.push(`**${passedChecks} / ${totalChecks} complete**`);
  lines.push("");
  for (const check of policy.checks) {
    const icon = check.passed ? "\u2713" : check.status === "INCOMPLETE" ? "\u{1F534}" : "\u{1F7E1}";
    lines.push(`- ${icon} ${check.message}`);
  }
  lines.push("");
  lines.push(`---`);
  lines.push(`### \u{1F3C1} Release Status`);
  lines.push(statusBadge);
  lines.push("");
  lines.push(`*Evidence Digest: \`${integrity.evidence_digest.substring(0, 16)}...\`*`);
  return lines.join("\n");
}

// packages/core/src/evidence.ts
import { writeFile } from "fs/promises";
import path from "path";

// packages/crypto/src/index.ts
import { createHash } from "crypto";
import { createReadStream } from "fs";
import canonicalize from "canonicalize";
var serializeJson = typeof canonicalize === "function" ? canonicalize : canonicalize.default || canonicalize;
function toCanonicalJson(data) {
  const canonical = serializeJson(data);
  if (canonical === void 0) {
    throw new Error("Cannot serialize undefined or invalid structure to canonical JSON");
  }
  return canonical;
}
function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}
async function calculateFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}
function computeEvidenceDigest(evidencePayload) {
  const { integrity, ...payloadWithoutIntegrity } = evidencePayload;
  const canonicalStr = toCanonicalJson(payloadWithoutIntegrity);
  return sha256Hex(canonicalStr);
}

// packages/policy/src/index.ts
function evaluatePolicy(input) {
  const { config, release, artifacts, tests, sbom, vulnerabilities } = input;
  const now = input.now || /* @__PURE__ */ new Date();
  const checks = [];
  if (!release.commit_sha || release.commit_sha.length < 7) {
    checks.push({
      check: "release_identity_commit",
      passed: false,
      status: "INCOMPLETE",
      message: "Immutable commit SHA is missing or invalid"
    });
  } else {
    checks.push({
      check: "release_identity_commit",
      passed: true,
      status: "READY",
      message: `Commit pinned: ${release.commit_sha.substring(0, 7)}`
    });
  }
  const expectedArtifactsCount = config.evidence.artifacts?.length || 0;
  if (expectedArtifactsCount > 0 && artifacts.length === 0) {
    checks.push({
      check: "artifact_hashes",
      passed: false,
      status: "INCOMPLETE",
      message: "Configured artifact patterns did not match any files"
    });
  } else if (artifacts.length > 0) {
    checks.push({
      check: "artifact_hashes",
      passed: true,
      status: "READY",
      message: `${artifacts.length} build artifact hash(es) generated`
    });
  }
  if (tests.status === "MISSING") {
    checks.push({
      check: "tests_available",
      passed: false,
      status: "INCOMPLETE",
      message: "Test reports not found or missing"
    });
  } else if (tests.status === "FAILED") {
    checks.push({
      check: "tests_available",
      passed: false,
      status: "REVIEW_REQUIRED",
      message: `Tests failed: ${tests.failed} failed out of ${tests.total}`
    });
  } else {
    checks.push({
      check: "tests_available",
      passed: true,
      status: "READY",
      message: `Tests passed: ${tests.passed}/${tests.total}`
    });
  }
  if (sbom.status === "MISSING") {
    checks.push({
      check: "sbom_available",
      passed: false,
      status: "INCOMPLETE",
      message: "SBOM is missing"
    });
  } else if (sbom.status === "INVALID") {
    checks.push({
      check: "sbom_available",
      passed: false,
      status: "INCOMPLETE",
      message: "SBOM format is invalid or corrupted"
    });
  } else {
    checks.push({
      check: "sbom_available",
      passed: true,
      status: "READY",
      message: `SBOM verified: ${sbom.format} (${sbom.component_count} components)`
    });
  }
  let hasCriticalUnaccepted = false;
  let hasHighReviewRequired = false;
  let hasExpiredRiskAcceptance = false;
  let hasKnownExploited = false;
  for (const vuln of vulnerabilities) {
    if (vuln.status === "RISK_ACCEPTED") {
      if (vuln.risk_acceptance?.expires_at) {
        const expiry = new Date(vuln.risk_acceptance.expires_at);
        if (expiry < now) {
          hasExpiredRiskAcceptance = true;
        }
      }
    } else if (vuln.status === "OPEN" || vuln.status === "REVIEW_REQUIRED") {
      if (vuln.severity === "CRITICAL") {
        hasCriticalUnaccepted = true;
      }
      if (vuln.severity === "HIGH") {
        hasHighReviewRequired = true;
      }
      if (vuln.known_exploited) {
        hasKnownExploited = true;
      }
    }
  }
  if (hasExpiredRiskAcceptance) {
    checks.push({
      check: "risk_acceptance_validity",
      passed: false,
      status: "REVIEW_REQUIRED",
      message: "One or more accepted risks have expired and require re-review"
    });
  }
  if (hasCriticalUnaccepted) {
    checks.push({
      check: "vulnerability_critical",
      passed: false,
      status: "REVIEW_REQUIRED",
      message: "Unreviewed CRITICAL vulnerability found"
    });
  }
  if (hasHighReviewRequired) {
    checks.push({
      check: "vulnerability_high",
      passed: false,
      status: "REVIEW_REQUIRED",
      message: "Unreviewed HIGH severity vulnerability found"
    });
  }
  if (hasKnownExploited) {
    checks.push({
      check: "vulnerability_known_exploited",
      passed: false,
      status: "REVIEW_REQUIRED",
      message: "Actively exploited vulnerability detected"
    });
  }
  if (!hasCriticalUnaccepted && !hasHighReviewRequired && !hasExpiredRiskAcceptance && !hasKnownExploited) {
    checks.push({
      check: "vulnerability_findings",
      passed: true,
      status: "READY",
      message: "Security findings reviewed and acceptable"
    });
  }
  if (config.profile.type === "cra-readiness") {
    const cra = config.cra;
    if (!cra || cra.applicability === "UNKNOWN") {
      checks.push({
        check: "cra_applicability",
        passed: false,
        status: "REVIEW_REQUIRED",
        message: "CRA applicability status is UNKNOWN (human declaration required)"
      });
    } else {
      checks.push({
        check: "cra_applicability",
        passed: true,
        status: "READY",
        message: `CRA applicability declared: ${cra.applicability}`
      });
    }
    if (!cra?.security_contact) {
      checks.push({
        check: "cra_security_contact",
        passed: false,
        status: "INCOMPLETE",
        message: "Security contact point missing for CRA readiness"
      });
    }
  }
  let overallStatus = "READY";
  const hasIncomplete = checks.some((c) => c.status === "INCOMPLETE");
  const hasReviewRequired = checks.some((c) => c.status === "REVIEW_REQUIRED");
  if (hasIncomplete) {
    overallStatus = "INCOMPLETE";
  } else if (hasReviewRequired) {
    overallStatus = "REVIEW_REQUIRED";
  } else {
    overallStatus = "READY";
  }
  return {
    profile: config.profile.type,
    status: overallStatus,
    checks,
    evaluated_at: now.toISOString()
  };
}

// packages/schema/src/index.ts
import { z } from "zod";
var SCHEMA_VERSION = "shipledger.evidence.v1";
var FindingStatusSchema = z.enum([
  "OPEN",
  "REVIEW_REQUIRED",
  "FIXED",
  "NOT_AFFECTED",
  "RISK_ACCEPTED"
]);
var EvaluationStatusSchema = z.enum([
  "READY",
  "REVIEW_REQUIRED",
  "INCOMPLETE"
]);
var ReleaseLifecycleStatusSchema = z.enum([
  "COLLECTING",
  "EVALUATING",
  "INCOMPLETE",
  "REVIEW_REQUIRED",
  "READY",
  "APPROVED",
  "RELEASED"
]);
var CraApplicabilitySchema = z.enum([
  "UNKNOWN",
  "IN_SCOPE",
  "OUT_OF_SCOPE"
]);
var ReleaseIdentitySchema = z.object({
  repository: z.string(),
  commit_sha: z.string().min(7),
  tag: z.string().optional(),
  workflow_run_id: z.string().optional(),
  created_at: z.string().datetime()
});
var SourceContextSchema = z.object({
  branch: z.string().optional(),
  actor: z.string().optional(),
  trigger: z.string().optional()
});
var ArtifactEvidenceSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha256: z.string().length(64),
  size: z.number().int().nonnegative(),
  created_at: z.string().datetime()
});
var TestResultsSchema = z.object({
  status: z.enum(["PASSED", "FAILED", "MISSING", "ERROR"]),
  passed: z.number().int().nonnegative().default(0),
  failed: z.number().int().nonnegative().default(0),
  skipped: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative().default(0),
  duration_seconds: z.number().nonnegative().optional(),
  reports: z.array(z.string()).default([])
});
var SbomComponentSchema = z.object({
  name: z.string(),
  version: z.string(),
  purl: z.string().optional(),
  type: z.string().optional(),
  license: z.string().optional()
});
var SbomEvidenceSchema = z.object({
  status: z.enum(["VERIFIED", "MISSING", "INVALID"]),
  format: z.enum(["CycloneDX", "SPDX", "UNKNOWN"]).optional(),
  spec_version: z.string().optional(),
  file_path: z.string().optional(),
  sha256: z.string().length(64).optional(),
  component_count: z.number().int().nonnegative().default(0),
  components: z.array(SbomComponentSchema).default([])
});
var VulnerabilityFindingSchema = z.object({
  id: z.string(),
  // e.g. CVE-2024-XXXX or GHSA-XXXX
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
var RiskAcceptanceSchema = z.object({
  finding: z.string(),
  decision: z.literal("RISK_ACCEPTED"),
  reason: z.string().min(1),
  approved_by: z.string().min(1),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime()
});
var PolicyCheckResultSchema = z.object({
  check: z.string(),
  passed: z.boolean(),
  status: EvaluationStatusSchema,
  message: z.string()
});
var PolicyEvaluationSchema = z.object({
  profile: z.enum(["baseline", "cra-readiness"]),
  status: EvaluationStatusSchema,
  checks: z.array(PolicyCheckResultSchema),
  evaluated_at: z.string().datetime()
});
var HumanApprovalSchema = z.object({
  approved_by: z.string(),
  timestamp: z.string().datetime(),
  comment: z.string().optional()
});
var IntegritySchema = z.object({
  algorithm: z.literal("sha256"),
  evidence_digest: z.string().length(64)
});
var ReleaseEvidenceBundleSchema = z.object({
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
var ShipledgerConfigSchema = z.object({
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

// packages/core/src/evidence.ts
async function buildEvidenceBundle(options) {
  const { config, release, source, artifacts, tests, sbom, outputDir = process.cwd() } = options;
  const now = options.now || /* @__PURE__ */ new Date();
  const configuredRiskAcceptances = config.risk_acceptances || [];
  const riskMap = /* @__PURE__ */ new Map();
  for (const ra of configuredRiskAcceptances) {
    riskMap.set(ra.finding, ra);
  }
  const processedVulns = options.vulnerabilities.map((v) => {
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
  const policy = evaluatePolicy({
    config,
    release,
    artifacts,
    tests,
    sbom,
    vulnerabilities: processedVulns,
    now
  });
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
  const evidenceDigest = computeEvidenceDigest(preliminaryBundle);
  const finalBundle = {
    ...preliminaryBundle,
    integrity: {
      algorithm: "sha256",
      evidence_digest: evidenceDigest
    }
  };
  const markdownSummary = generateMarkdownSummary(finalBundle, config.product.name);
  const evidenceJsonPath = path.resolve(outputDir, "shipledger-evidence.json");
  const evidenceMdPath = path.resolve(outputDir, "shipledger-evidence.md");
  const canonicalJsonContent = toCanonicalJson(finalBundle);
  await writeFile(evidenceJsonPath, canonicalJsonContent, "utf-8");
  await writeFile(evidenceMdPath, markdownSummary, "utf-8");
  const criticalCount = processedVulns.filter((v) => v.severity === "CRITICAL" && v.status !== "RISK_ACCEPTED").length;
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

// packages/core/src/diff.ts
function computeReleaseDiff(prevBundle, currBundle) {
  const prevComps = /* @__PURE__ */ new Map();
  for (const c of prevBundle.sbom.components) {
    prevComps.set(c.name, c.version);
  }
  const currComps = /* @__PURE__ */ new Map();
  for (const c of currBundle.sbom.components) {
    currComps.set(c.name, c.version);
  }
  const addedDeps = [];
  const removedDeps = [];
  const updatedDeps = [];
  for (const [name, version] of currComps.entries()) {
    if (!prevComps.has(name)) {
      addedDeps.push({ name, version });
    } else {
      const prevVersion = prevComps.get(name);
      if (prevVersion !== version) {
        updatedDeps.push({ name, fromVersion: prevVersion, toVersion: version });
      }
    }
  }
  for (const [name, version] of prevComps.entries()) {
    if (!currComps.has(name)) {
      removedDeps.push({ name, version });
    }
  }
  const prevVulns = /* @__PURE__ */ new Map();
  for (const v of prevBundle.vulnerabilities) {
    prevVulns.set(v.id, { severity: v.severity, status: v.status, package_name: v.package_name });
  }
  const currVulns = /* @__PURE__ */ new Map();
  for (const v of currBundle.vulnerabilities) {
    currVulns.set(v.id, { severity: v.severity, status: v.status, package_name: v.package_name });
  }
  const introducedVulns = [];
  const resolvedVulns = [];
  const statusChangedVulns = [];
  for (const [id, curr] of currVulns.entries()) {
    if (!prevVulns.has(id)) {
      introducedVulns.push({ id, package_name: curr.package_name, severity: curr.severity });
    } else {
      const prev = prevVulns.get(id);
      if (prev.status !== curr.status) {
        statusChangedVulns.push({ id, fromStatus: prev.status, toStatus: curr.status });
      }
    }
  }
  for (const [id, prev] of prevVulns.entries()) {
    if (!currVulns.has(id)) {
      resolvedVulns.push({ id, package_name: prev.package_name, severity: prev.severity });
    }
  }
  const tests = {
    passedDiff: currBundle.tests.passed - prevBundle.tests.passed,
    failedDiff: currBundle.tests.failed - prevBundle.tests.failed,
    totalDiff: currBundle.tests.total - prevBundle.tests.total,
    prevPassed: prevBundle.tests.passed,
    currPassed: currBundle.tests.passed,
    prevFailed: prevBundle.tests.failed,
    currFailed: currBundle.tests.failed
  };
  const prevArtifacts = /* @__PURE__ */ new Map();
  for (const a of prevBundle.artifacts) {
    prevArtifacts.set(a.name, a.sha256);
  }
  const currArtifacts = /* @__PURE__ */ new Map();
  for (const a of currBundle.artifacts) {
    currArtifacts.set(a.name, a.sha256);
  }
  const addedArtifacts = [];
  const removedArtifacts = [];
  const changedArtifacts = [];
  for (const [name, sha] of currArtifacts.entries()) {
    if (!prevArtifacts.has(name)) {
      addedArtifacts.push(name);
    } else if (prevArtifacts.get(name) !== sha) {
      changedArtifacts.push(name);
    }
  }
  for (const name of prevArtifacts.keys()) {
    if (!currArtifacts.has(name)) {
      removedArtifacts.push(name);
    }
  }
  return {
    fromRelease: {
      tag: prevBundle.release.tag,
      commit_sha: prevBundle.release.commit_sha
    },
    toRelease: {
      tag: currBundle.release.tag,
      commit_sha: currBundle.release.commit_sha
    },
    policyChange: {
      fromStatus: prevBundle.policy.status,
      toStatus: currBundle.policy.status
    },
    dependencies: {
      added: addedDeps.sort((a, b) => a.name.localeCompare(b.name)),
      removed: removedDeps.sort((a, b) => a.name.localeCompare(b.name)),
      updated: updatedDeps.sort((a, b) => a.name.localeCompare(b.name))
    },
    security: {
      introduced: introducedVulns,
      resolved: resolvedVulns,
      statusChanged: statusChangedVulns
    },
    tests,
    artifacts: {
      added: addedArtifacts,
      removed: removedArtifacts,
      changed: changedArtifacts
    }
  };
}
function formatReleaseDiffMarkdown(diff) {
  const fromVer = diff.fromRelease.tag || diff.fromRelease.commit_sha.substring(0, 7);
  const toVer = diff.toRelease.tag || diff.toRelease.commit_sha.substring(0, 7);
  const lines = [];
  lines.push(`# \u{1F500} ShipLedger Release Diff`);
  lines.push(`**${fromVer} \u2192 ${toVer}**`);
  lines.push("");
  if (diff.policyChange.fromStatus !== diff.policyChange.toStatus) {
    lines.push(`**Status Changed:** \`${diff.policyChange.fromStatus}\` \u2794 \`${diff.policyChange.toStatus}\``);
    lines.push("");
  }
  lines.push(`### \u{1F6E1} Security Findings Diff`);
  if (diff.security.introduced.length === 0 && diff.security.resolved.length === 0 && diff.security.statusChanged.length === 0) {
    lines.push(`- No security finding changes`);
  } else {
    for (const v of diff.security.introduced) {
      lines.push(`- \u2795 Introduced: **${v.id}** (${v.package_name}, ${v.severity})`);
    }
    for (const v of diff.security.resolved) {
      lines.push(`- \u2796 Resolved: **${v.id}** (${v.package_name}, ${v.severity})`);
    }
    for (const s of diff.security.statusChanged) {
      lines.push(`- \u{1F504} Status: **${s.id}** (\`${s.fromStatus}\` \u2794 \`${s.toStatus}\`)`);
    }
  }
  lines.push("");
  lines.push(`### \u{1F4E6} Dependency Changes`);
  if (diff.dependencies.added.length === 0 && diff.dependencies.removed.length === 0 && diff.dependencies.updated.length === 0) {
    lines.push(`- No dependency changes`);
  } else {
    for (const d of diff.dependencies.added) {
      lines.push(`- \u2795 \`+ ${d.name} ${d.version}\``);
    }
    for (const d of diff.dependencies.removed) {
      lines.push(`- \u2796 \`- ${d.name} ${d.version}\``);
    }
    for (const u of diff.dependencies.updated) {
      lines.push(`- \u{1F199} \`${u.name}\`: **${u.fromVersion}** \u2794 **${u.toVersion}**`);
    }
  }
  lines.push("");
  lines.push(`### \u{1F9EA} Tests Diff`);
  const passedDelta = diff.tests.passedDiff >= 0 ? `+${diff.tests.passedDiff}` : `${diff.tests.passedDiff}`;
  const failedDelta = diff.tests.failedDiff >= 0 ? `+${diff.tests.failedDiff}` : `${diff.tests.failedDiff}`;
  lines.push(`- Passed tests: **${diff.tests.currPassed}** (${passedDelta})`);
  lines.push(`- Failed tests: **${diff.tests.currFailed}** (${failedDelta})`);
  lines.push("");
  if (diff.artifacts.added.length > 0 || diff.artifacts.removed.length > 0 || diff.artifacts.changed.length > 0) {
    lines.push(`### \u{1F4C1} Artifact Changes`);
    for (const a of diff.artifacts.added) lines.push(`- \u2795 Added: \`${a}\``);
    for (const a of diff.artifacts.removed) lines.push(`- \u2796 Removed: \`${a}\``);
    for (const a of diff.artifacts.changed) lines.push(`- \u{1F504} Checksum changed: \`${a}\``);
    lines.push("");
  }
  return lines.join("\n");
}

export {
  calculateFileSha256,
  computeEvidenceDigest,
  queryOsvForComponents,
  generateMarkdownSummary,
  ReleaseEvidenceBundleSchema,
  ShipledgerConfigSchema,
  buildEvidenceBundle,
  computeReleaseDiff,
  formatReleaseDiffMarkdown
};
//# sourceMappingURL=chunk-T6PTJPZM.js.map