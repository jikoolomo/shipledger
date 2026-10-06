import type {
  EvaluationStatus,
  PolicyCheckResult,
  PolicyEvaluation,
  ReleaseEvidenceBundle,
  ShipledgerConfig
} from "@shipledger/schema";

export interface PolicyEvaluationInput {
  config: ShipledgerConfig;
  release: ReleaseEvidenceBundle["release"];
  artifacts: ReleaseEvidenceBundle["artifacts"];
  tests: ReleaseEvidenceBundle["tests"];
  sbom: ReleaseEvidenceBundle["sbom"];
  vulnerabilities: ReleaseEvidenceBundle["vulnerabilities"];
  now?: Date;
}

export function evaluatePolicy(input: PolicyEvaluationInput): PolicyEvaluation {
  const { config, release, artifacts, tests, sbom, vulnerabilities } = input;
  const now = input.now || new Date();
  const checks: PolicyCheckResult[] = [];

  // --- 1. Release Identity Check ---
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

  // --- 2. Artifacts Check ---
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

  // --- 3. Tests Check ---
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

  // --- 4. SBOM Check (Section 13: SBOM이 없으면 Evidence Missing이지 Safe가 아님) ---
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

  // --- 5. Vulnerability & Risk Acceptance Check (Section 16, 18) ---
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

  // --- 6. CRA Profile Check (if cra-readiness) ---
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

  // Determine Overall Status (Deterministic Priority: INCOMPLETE > REVIEW_REQUIRED > READY)
  let overallStatus: EvaluationStatus = "READY";

  const hasIncomplete = checks.some(c => c.status === "INCOMPLETE");
  const hasReviewRequired = checks.some(c => c.status === "REVIEW_REQUIRED");

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
