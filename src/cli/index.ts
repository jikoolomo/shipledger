import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { computeEvidenceDigest } from "@shipledger/crypto";
import { buildEvidenceBundle, generateMarkdownSummary, queryOsvForComponents } from "@shipledger/core";
import { collectArtifacts, loadConfig, parseJUnitReports, parseSbom } from "@shipledger/parsers";
import { ReleaseEvidenceBundleSchema, type ReleaseIdentity, type SourceContext } from "@shipledger/schema";

const program = new Command();

program
  .name("shipledger")
  .description("ShipLedger CLI - Release Evidence Infrastructure")
  .version("0.1.0");

program
  .command("run")
  .description("Collect evidence, evaluate policy, and generate release evidence bundle")
  .option("-c, --config <path>", "Path to .shipledger.yml", ".shipledger.yml")
  .option("-o, --output-dir <path>", "Output directory for evidence bundle", ".")
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(options.config, cwd);
      console.log(`[ShipLedger] Loaded config for product: ${config.product.name}`);

      // Git context fallback
      let commitSha = process.env.GITHUB_SHA || "0000000000000000000000000000000000000000";
      let branch = process.env.GITHUB_REF_NAME || "local";
      try {
        commitSha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
        branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
      } catch {
        // Fallback if not inside git
      }

      const release: ReleaseIdentity = {
        repository: process.env.GITHUB_REPOSITORY || `local/${config.product.id}`,
        commit_sha: commitSha,
        tag: config.product.version || process.env.GITHUB_REF_NAME,
        workflow_run_id: process.env.GITHUB_RUN_ID,
        created_at: new Date().toISOString()
      };

      const source: SourceContext = {
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
        outputDir: path.resolve(cwd, options.outputDir)
      });

      console.log("\n" + result.markdownSummary + "\n");
      console.log(`[ShipLedger] Evidence JSON saved to: ${result.evidenceJsonPath}`);
      console.log(`[ShipLedger] Evidence Digest: ${result.outputs.evidence_digest}`);
      console.log(`[ShipLedger] Status: ${result.outputs.status}`);

      if (config.mode === "enforce" && result.outputs.status !== "READY") {
        console.error(`[ShipLedger] Gate check failed with status: ${result.outputs.status}`);
        process.exit(1);
      }
    } catch (err: any) {
      console.error("[ShipLedger ERROR]:", err.message);
      process.exit(1);
    }
  });

program
  .command("verify")
  .description("Verify cryptographic integrity of an existing evidence bundle")
  .argument("<file>", "Path to shipledger-evidence.json")
  .action(async (filePath) => {
    try {
      const raw = await readFile(path.resolve(process.cwd(), filePath), "utf-8");
      const json = JSON.parse(raw);
      const parsed = ReleaseEvidenceBundleSchema.parse(json);

      const calculatedDigest = computeEvidenceDigest(parsed as any);
      if (calculatedDigest === parsed.integrity.evidence_digest) {
        console.log(`✓ VERIFIED: Evidence digest matches (${calculatedDigest})`);
      } else {
        console.error(`❌ TAMPERED: Digest mismatch! Expected: ${parsed.integrity.evidence_digest}, Found: ${calculatedDigest}`);
        process.exit(1);
      }
    } catch (err: any) {
      console.error("[ShipLedger ERROR]:", err.message);
      process.exit(1);
    }
  });

program
  .command("diff")
  .description("Compare two release evidence bundles and display changes")
  .argument("<prevFile>", "Path to previous release shipledger-evidence.json")
  .argument("[currFile]", "Path to current release shipledger-evidence.json (default: ./shipledger-evidence.json)", "shipledger-evidence.json")
  .action(async (prevFile, currFile) => {
    try {
      const rawPrev = await readFile(path.resolve(process.cwd(), prevFile), "utf-8");
      const rawCurr = await readFile(path.resolve(process.cwd(), currFile), "utf-8");

      const prev = ReleaseEvidenceBundleSchema.parse(JSON.parse(rawPrev));
      const curr = ReleaseEvidenceBundleSchema.parse(JSON.parse(rawCurr));

      const { computeReleaseDiff, formatReleaseDiffMarkdown } = await import("@shipledger/core");
      const diffResult = computeReleaseDiff(prev, curr);
      const markdown = formatReleaseDiffMarkdown(diffResult);

      console.log("\n" + markdown + "\n");
    } catch (err: any) {
      console.error("[ShipLedger ERROR]:", err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

