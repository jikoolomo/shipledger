#!/usr/bin/env node

// src/cli/index.ts
import { execSync } from "child_process";
import { readFile as readFile4 } from "fs/promises";
import path5 from "path";
import { Command } from "commander";

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

// packages/parsers/src/artifact.ts
import { stat } from "fs/promises";
import path2 from "path";
import fg from "fast-glob";
async function collectArtifacts(patterns, cwd = process.cwd()) {
  if (!patterns || patterns.length === 0) {
    return [];
  }
  const matchedPaths = await fg(patterns, {
    cwd,
    absolute: true,
    onlyFiles: true,
    unique: true
  });
  const results = [];
  for (const absPath of matchedPaths) {
    try {
      const fileStat = await stat(absPath);
      const sha256 = await calculateFileSha256(absPath);
      const relativePath = path2.relative(cwd, absPath);
      results.push({
        name: path2.basename(absPath),
        path: relativePath,
        sha256,
        size: fileStat.size,
        created_at: fileStat.birthtime.toISOString() || fileStat.mtime.toISOString()
      });
    } catch (err) {
      console.warn(`Failed to process artifact ${absPath}:`, err);
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

// packages/parsers/src/sbom.ts
import { readFile } from "fs/promises";
import path3 from "path";
async function parseSbom(filePath, cwd = process.cwd()) {
  if (!filePath) {
    return {
      status: "MISSING",
      component_count: 0,
      components: []
    };
  }
  const absPath = path3.isAbsolute(filePath) ? filePath : path3.resolve(cwd, filePath);
  let rawContent;
  let fileSha256;
  try {
    rawContent = await readFile(absPath, "utf-8");
    fileSha256 = await calculateFileSha256(absPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      return {
        status: "MISSING",
        file_path: filePath,
        component_count: 0,
        components: []
      };
    }
    return {
      status: "INVALID",
      file_path: filePath,
      component_count: 0,
      components: []
    };
  }
  let json;
  try {
    json = JSON.parse(rawContent);
  } catch {
    return {
      status: "INVALID",
      file_path: filePath,
      sha256: fileSha256,
      component_count: 0,
      components: []
    };
  }
  if (json.bomFormat === "CycloneDX" || typeof json.specVersion === "string" && Array.isArray(json.components)) {
    const components = (json.components || []).map((c) => ({
      name: c.name || "unknown",
      version: c.version || "unknown",
      purl: c.purl,
      type: c.type,
      license: c.licenses?.[0]?.license?.id || c.licenses?.[0]?.license?.name
    }));
    return {
      status: "VERIFIED",
      format: "CycloneDX",
      spec_version: json.specVersion,
      file_path: filePath,
      sha256: fileSha256,
      component_count: components.length,
      components
    };
  }
  if (typeof json.spdxVersion === "string" && (Array.isArray(json.packages) || json.SPDXID)) {
    const rawPackages = Array.isArray(json.packages) ? json.packages : [];
    const components = rawPackages.map((p) => {
      const purlRef = p.externalRefs?.find(
        (ref) => ref.referenceType === "purl" || ref.referenceType?.toLowerCase()?.includes("purl")
      );
      return {
        name: p.name || "unknown",
        version: p.versionInfo || "unknown",
        purl: purlRef?.referenceLocator,
        type: "library",
        license: typeof p.licenseConcluded === "string" && p.licenseConcluded !== "NOASSERTION" ? p.licenseConcluded : void 0
      };
    });
    return {
      status: "VERIFIED",
      format: "SPDX",
      spec_version: json.spdxVersion,
      file_path: filePath,
      sha256: fileSha256,
      component_count: components.length,
      components
    };
  }
  return {
    status: "INVALID",
    format: "UNKNOWN",
    file_path: filePath,
    sha256: fileSha256,
    component_count: 0,
    components: []
  };
}

// packages/parsers/src/junit.ts
import { readFile as readFile2 } from "fs/promises";
import fg2 from "fast-glob";
import { XMLParser } from "fast-xml-parser";
async function parseJUnitReports(patterns = [], cwd = process.cwd()) {
  if (!patterns || patterns.length === 0) {
    return {
      status: "MISSING",
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      reports: []
    };
  }
  const matchedFiles = await fg2(patterns, {
    cwd,
    absolute: true,
    onlyFiles: true
  });
  if (matchedFiles.length === 0) {
    return {
      status: "MISSING",
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      reports: []
    };
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  let totalTests = 0;
  let totalFailures = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalDuration = 0;
  const processedReports = [];
  for (const file of matchedFiles) {
    try {
      const xmlData = await readFile2(file, "utf-8");
      const parsed = parser.parse(xmlData);
      processedReports.push(file);
      const suites = [];
      if (parsed.testsuites?.testsuite) {
        if (Array.isArray(parsed.testsuites.testsuite)) {
          suites.push(...parsed.testsuites.testsuite);
        } else {
          suites.push(parsed.testsuites.testsuite);
        }
      } else if (parsed.testsuite) {
        if (Array.isArray(parsed.testsuite)) {
          suites.push(...parsed.testsuite);
        } else {
          suites.push(parsed.testsuite);
        }
      } else if (parsed.testsuites) {
        suites.push(parsed.testsuites);
      }
      for (const suite of suites) {
        const tests = parseInt(suite["@_tests"] || "0", 10);
        const failures = parseInt(suite["@_failures"] || "0", 10);
        const errors = parseInt(suite["@_errors"] || "0", 10);
        const skipped = parseInt(suite["@_skipped"] || suite["@_disabled"] || "0", 10);
        const time = parseFloat(suite["@_time"] || "0");
        totalTests += isNaN(tests) ? 0 : tests;
        totalFailures += isNaN(failures) ? 0 : failures;
        totalErrors += isNaN(errors) ? 0 : errors;
        totalSkipped += isNaN(skipped) ? 0 : skipped;
        totalDuration += isNaN(time) ? 0 : time;
      }
    } catch (err) {
      console.warn(`Failed to parse test report ${file}:`, err);
    }
  }
  const totalFailed = totalFailures + totalErrors;
  const passed = Math.max(0, totalTests - totalFailed - totalSkipped);
  let status = "PASSED";
  if (processedReports.length === 0) {
    status = "MISSING";
  } else if (totalFailed > 0) {
    status = "FAILED";
  }
  return {
    status,
    passed,
    failed: totalFailed,
    skipped: totalSkipped,
    total: totalTests,
    duration_seconds: Math.round(totalDuration * 100) / 100,
    reports: processedReports
  };
}

// packages/parsers/src/config.ts
import { readFile as readFile3 } from "fs/promises";
import path4 from "path";
import yaml from "yaml";
async function loadConfig(configPath = ".shipledger.yml", cwd = process.cwd()) {
  const absPath = path4.isAbsolute(configPath) ? configPath : path4.resolve(cwd, configPath);
  let rawContent;
  try {
    rawContent = await readFile3(absPath, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`ShipLedger configuration file not found at: ${absPath}`);
    }
    throw new Error(`Failed to read configuration file: ${err.message}`);
  }
  let parsedYaml;
  try {
    parsedYaml = yaml.parse(rawContent);
  } catch (err) {
    throw new Error(`Invalid YAML format in ${configPath}: ${err.message}`);
  }
  const validationResult = ShipledgerConfigSchema.safeParse(parsedYaml);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`ShipLedger configuration validation error:
${errorDetails}`);
  }
  return validationResult.data;
}

// src/cli/index.ts
var program = new Command();
program.name("shipledger").description("ShipLedger CLI - Release Evidence Infrastructure").version("0.1.0");
program.command("run").description("Collect evidence, evaluate policy, and generate release evidence bundle").option("-c, --config <path>", "Path to .shipledger.yml", ".shipledger.yml").option("-o, --output-dir <path>", "Output directory for evidence bundle", ".").action(async (options) => {
  try {
    const cwd = process.cwd();
    const config = await loadConfig(options.config, cwd);
    console.log(`[ShipLedger] Loaded config for product: ${config.product.name}`);
    let commitSha = process.env.GITHUB_SHA || "0000000000000000000000000000000000000000";
    let branch = process.env.GITHUB_REF_NAME || "local";
    try {
      commitSha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
      branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    } catch {
    }
    const release = {
      repository: process.env.GITHUB_REPOSITORY || `local/${config.product.id}`,
      commit_sha: commitSha,
      tag: config.product.version || process.env.GITHUB_REF_NAME,
      workflow_run_id: process.env.GITHUB_RUN_ID,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const source = {
      branch,
      actor: process.env.GITHUB_ACTOR || process.env.USER || "developer",
      trigger: process.env.GITHUB_EVENT_NAME || "manual"
    };
    console.log("[ShipLedger] Collecting artifacts...");
    const artifacts = await collectArtifacts(config.evidence.artifacts || [], cwd);
    console.log("[ShipLedger] Parsing test reports...");
    const tests = await parseJUnitReports(config.evidence.tests?.junit || [], cwd);
    console.log("[ShipLedger] Parsing SBOM...");
    const sbom = await parseSbom(config.evidence.sbom?.path, cwd);
    console.log("[ShipLedger] Checking vulnerabilities via OSV...");
    const vulnerabilities = await queryOsvForComponents(sbom.components);
    console.log("[ShipLedger] Evaluating policy & building bundle...");
    const result = await buildEvidenceBundle({
      config,
      release,
      source,
      artifacts,
      tests,
      sbom,
      vulnerabilities,
      outputDir: path5.resolve(cwd, options.outputDir)
    });
    console.log("\n" + result.markdownSummary + "\n");
    console.log(`[ShipLedger] Evidence JSON saved to: ${result.evidenceJsonPath}`);
    console.log(`[ShipLedger] Evidence Digest: ${result.outputs.evidence_digest}`);
    console.log(`[ShipLedger] Status: ${result.outputs.status}`);
    if (config.mode === "enforce" && result.outputs.status !== "READY") {
      console.error(`[ShipLedger] Gate check failed with status: ${result.outputs.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error("[ShipLedger ERROR]:", err.message);
    process.exit(1);
  }
});
program.command("verify").description("Verify cryptographic integrity of an existing evidence bundle").argument("<file>", "Path to shipledger-evidence.json").action(async (filePath) => {
  try {
    const raw = await readFile4(path5.resolve(process.cwd(), filePath), "utf-8");
    const json = JSON.parse(raw);
    const parsed = ReleaseEvidenceBundleSchema.parse(json);
    const calculatedDigest = computeEvidenceDigest(parsed);
    if (calculatedDigest === parsed.integrity.evidence_digest) {
      console.log(`\u2713 VERIFIED: Evidence digest matches (${calculatedDigest})`);
    } else {
      console.error(`\u274C TAMPERED: Digest mismatch! Expected: ${parsed.integrity.evidence_digest}, Found: ${calculatedDigest}`);
      process.exit(1);
    }
  } catch (err) {
    console.error("[ShipLedger ERROR]:", err.message);
    process.exit(1);
  }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map