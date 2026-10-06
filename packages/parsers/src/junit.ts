import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { XMLParser } from "fast-xml-parser";
import type { TestResults } from "@shipledger/schema";

export async function parseJUnitReports(patterns: string[] = [], cwd: string = process.cwd()): Promise<TestResults> {
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

  const matchedFiles = await fg(patterns, {
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
  const processedReports: string[] = [];

  for (const file of matchedFiles) {
    try {
      const xmlData = await readFile(file, "utf-8");
      const parsed = parser.parse(xmlData);

      processedReports.push(file);

      // Handle <testsuites> or single <testsuite>
      const suites: any[] = [];
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
        // Maybe top level testsuites has attributes
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

  let status: "PASSED" | "FAILED" | "MISSING" | "ERROR" = "PASSED";
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
