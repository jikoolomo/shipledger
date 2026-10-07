#!/usr/bin/env node
import {
  ReleaseEvidenceBundleSchema,
  ShipledgerConfigSchema,
  buildEvidenceBundle,
  calculateFileSha256,
  computeEvidenceDigest,
  queryOsvForComponents
} from "../chunk-5IIO5PBN.js";

// src/cli/index.ts
import { execSync } from "child_process";
import { readFile as readFile4 } from "fs/promises";
import path4 from "path";
import { Command } from "commander";

// packages/parsers/src/artifact.ts
import { stat } from "fs/promises";
import path from "path";
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
      const relativePath = path.relative(cwd, absPath);
      results.push({
        name: path.basename(absPath),
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
import path2 from "path";
async function parseSbom(filePath, cwd = process.cwd()) {
  if (!filePath) {
    return {
      status: "MISSING",
      component_count: 0,
      components: []
    };
  }
  const absPath = path2.isAbsolute(filePath) ? filePath : path2.resolve(cwd, filePath);
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
import path3 from "path";
import yaml from "yaml";
async function loadConfig(configPath = ".shipledger.yml", cwd = process.cwd()) {
  const absPath = path3.isAbsolute(configPath) ? configPath : path3.resolve(cwd, configPath);
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
program.name("shipledger").description("ShipLedger CLI - Release Evidence Infrastructure").version("0.2.0");
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
      outputDir: path4.resolve(cwd, options.outputDir)
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
    const raw = await readFile4(path4.resolve(process.cwd(), filePath), "utf-8");
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
program.command("diff").description("Compare two release evidence bundles and display changes").argument("<prevFile>", "Path to previous release shipledger-evidence.json").argument("[currFile]", "Path to current release shipledger-evidence.json (default: ./shipledger-evidence.json)", "shipledger-evidence.json").action(async (prevFile, currFile) => {
  try {
    const rawPrev = await readFile4(path4.resolve(process.cwd(), prevFile), "utf-8");
    const rawCurr = await readFile4(path4.resolve(process.cwd(), currFile), "utf-8");
    const prev = ReleaseEvidenceBundleSchema.parse(JSON.parse(rawPrev));
    const curr = ReleaseEvidenceBundleSchema.parse(JSON.parse(rawCurr));
    const { computeReleaseDiff, formatReleaseDiffMarkdown } = await import("../src-Z7R5E5XH.js");
    const diffResult = computeReleaseDiff(prev, curr);
    const markdown = formatReleaseDiffMarkdown(diffResult);
    console.log("\n" + markdown + "\n");
  } catch (err) {
    console.error("[ShipLedger ERROR]:", err.message);
    process.exit(1);
  }
});
program.command("monitor").description("Continuously monitor SBOM components of an evidence bundle against latest vulnerability data").argument("<file>", "Path to shipledger-evidence.json").action(async (filePath) => {
  try {
    const raw = await readFile4(path4.resolve(process.cwd(), filePath), "utf-8");
    const bundle = ReleaseEvidenceBundleSchema.parse(JSON.parse(raw));
    const { monitorReleaseVulnerabilities } = await import("../src-Z7R5E5XH.js");
    const result = await monitorReleaseVulnerabilities({ bundle });
    console.log("\n" + result.markdownReport + "\n");
    if (result.has_potential_security_event) {
      console.warn(`[ShipLedger ALERT] ${result.alert} (${result.new_findings.length} newly discovered findings)`);
    }
  } catch (err) {
    console.error("[ShipLedger ERROR]:", err.message);
    process.exit(1);
  }
});
program.command("export").description("Generate an EU Cyber Resilience Act (CRA Article 14) Incident Dossier").argument("<file>", "Path to shipledger-evidence.json").requiredOption("--finding <id>", "Vulnerability finding ID (e.g. CVE-2024-XXXX or GHSA-XXXX)").option("--type <type>", "Incident type (ACTIVELY_EXPLOITED_VULNERABILITY, SEVERE_SECURITY_INCIDENT, OTHER)", "ACTIVELY_EXPLOITED_VULNERABILITY").option("--awareness <time>", "Human confirmed awareness time (ISO string)", (/* @__PURE__ */ new Date()).toISOString()).option("--confirmed-by <actor>", "Name or email of confirmed actor", process.env.USER || "security-lead").option("--contact <email>", "Security contact point email", "security@oruvena.com").action(async (filePath, options) => {
  try {
    const raw = await readFile4(path4.resolve(process.cwd(), filePath), "utf-8");
    const bundle = ReleaseEvidenceBundleSchema.parse(JSON.parse(raw));
    const { generateCraIncidentDossier, renderCraDossierMarkdown } = await import("../src-Z7R5E5XH.js");
    const dossier = generateCraIncidentDossier({
      bundle,
      findingId: options.finding,
      incidentType: options.type,
      confirmedAwarenessTime: options.awareness,
      confirmedBy: options.confirmedBy,
      securityContact: options.contact
    });
    console.log("\n" + renderCraDossierMarkdown(dossier) + "\n");
    console.log(`[ShipLedger] Dossier ID: ${dossier.dossier_id}`);
    console.log(`[ShipLedger] 24h Early Warning Deadline: ${dossier.regulatory_timeline.early_warning_deadline_24h} (${dossier.regulatory_timeline.early_warning_remaining_hours}h remaining)`);
    console.log(`[ShipLedger] 72h Notification Deadline: ${dossier.regulatory_timeline.full_notification_deadline_72h} (${dossier.regulatory_timeline.full_notification_remaining_hours}h remaining)`);
  } catch (err) {
    console.error("[ShipLedger ERROR]:", err.message);
    process.exit(1);
  }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map