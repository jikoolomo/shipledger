import * as core from "@actions/core";
import * as github from "@actions/github";
import { buildEvidenceBundle, queryOsvForComponents } from "@shipledger/core";
import { collectArtifacts, loadConfig, parseJUnitReports, parseSbom } from "@shipledger/parsers";
import type { ReleaseIdentity, SourceContext } from "@shipledger/schema";

async function run(): Promise<void> {
  try {
    const configPath = core.getInput("config") || ".shipledger.yml";
    core.info(`Loading ShipLedger config from: ${configPath}`);

    const config = await loadConfig(configPath);
    core.info(`Product: ${config.product.name} (Profile: ${config.profile.type}, Mode: ${config.mode})`);

    // 1. Resolve Release Identity (Section 10)
    const context = github.context;
    const commitSha = process.env.GITHUB_SHA || context.sha;
    const repo = process.env.GITHUB_REPOSITORY || `${context.repo.owner}/${context.repo.repo}`;
    const tag = process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : undefined;

    const release: ReleaseIdentity = {
      repository: repo,
      commit_sha: commitSha,
      tag: tag || config.product.version,
      workflow_run_id: process.env.GITHUB_RUN_ID || (context.runId ? String(context.runId) : undefined),
      created_at: new Date().toISOString()
    };

    const source: SourceContext = {
      branch: process.env.GITHUB_REF_NAME,
      actor: process.env.GITHUB_ACTOR || context.actor,
      trigger: process.env.GITHUB_EVENT_NAME || context.eventName
    };

    // 2. Collect Artifacts (Section 12)
    core.info("Collecting artifact hashes...");
    const artifacts = await collectArtifacts(config.evidence.artifacts || []);
    core.info(`Found ${artifacts.length} matching artifact(s)`);

    // 3. Parse Tests (Section 11, 24)
    core.info("Parsing test reports...");
    const tests = await parseJUnitReports(config.evidence.tests?.junit || []);
    core.info(`Test results: ${tests.passed} passed, ${tests.failed} failed, status: ${tests.status}`);

    // 4. Parse SBOM (Section 13)
    core.info("Parsing SBOM file...");
    const sbom = await parseSbom(config.evidence.sbom?.path);
    core.info(`SBOM status: ${sbom.status} (${sbom.component_count} components)`);

    // 5. Query Vulnerabilities (Section 14)
    core.info("Checking vulnerabilities with OSV...");
    const vulnerabilities = await queryOsvForComponents(sbom.components);
    core.info(`Vulnerability findings: ${vulnerabilities.length}`);

    // 6. Build Evidence Bundle & Integrity Digest (Section 11, 27)
    core.info("Evaluating deterministic policy and assembling evidence bundle...");
    const result = await buildEvidenceBundle({
      config,
      release,
      source,
      artifacts,
      tests,
      sbom,
      vulnerabilities
    });

    // 7. Write GitHub Job Summary (Section 24)
    await core.summary.addRaw(result.markdownSummary).write();

    // 8. Set Outputs (Section 25)
    core.setOutput("status", result.outputs.status);
    core.setOutput("evidence_path", result.outputs.evidence_path);
    core.setOutput("evidence_digest", result.outputs.evidence_digest);
    core.setOutput("finding_count", result.outputs.finding_count);
    core.setOutput("critical_count", result.outputs.critical_count);
    core.setOutput("review_required", result.outputs.review_required);

    core.info(`Evidence successfully generated! Digest: ${result.outputs.evidence_digest}`);
    core.info(`Overall Status: ${result.outputs.status}`);

    // 9. Enforce Mode Check (Section 26: 기본 advisory, enforce일 때만 차단)
    if (config.mode === "enforce" && result.outputs.status !== "READY") {
      core.setFailed(`ShipLedger gate failed with status: ${result.outputs.status}`);
    }
  } catch (error: any) {
    core.setFailed(`ShipLedger Action error: ${error.message}`);
  }
}

void run();
