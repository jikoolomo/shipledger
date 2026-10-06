import path from "node:path";
import { describe, expect, it } from "vitest";
import { collectArtifacts, parseJUnitReports, parseSbom } from "../packages/parsers/src/index.js";

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

describe("Parsers Module", () => {
  it("should successfully parse valid CycloneDX SBOM", async () => {
    const sbom = await parseSbom(path.join(FIXTURES_DIR, "cyclonedx.json"));
    expect(sbom.status).toBe("VERIFIED");
    expect(sbom.format).toBe("CycloneDX");
    expect(sbom.component_count).toBe(2);
    expect(sbom.components[0].name).toBe("fast-glob");
    expect(sbom.components[0].purl).toBe("pkg:npm/fast-glob@3.3.2");
  });

  it("should successfully parse valid SPDX SBOM", async () => {
    const sbom = await parseSbom(path.join(FIXTURES_DIR, "spdx.json"));
    expect(sbom.status).toBe("VERIFIED");
    expect(sbom.format).toBe("SPDX");
    expect(sbom.component_count).toBe(1);
    expect(sbom.components[0].name).toBe("express");
    expect(sbom.components[0].purl).toBe("pkg:npm/express@4.19.2");
  });

  it("should return status MISSING when SBOM file is not found (Fail-safe)", async () => {
    const sbom = await parseSbom("non-existent-sbom.json");
    expect(sbom.status).toBe("MISSING");
    expect(sbom.component_count).toBe(0);
  });

  it("should parse passing JUnit reports", async () => {
    const tests = await parseJUnitReports([path.join(FIXTURES_DIR, "junit-passed.xml")]);
    expect(tests.status).toBe("PASSED");
    expect(tests.passed).toBe(2);
    expect(tests.failed).toBe(0);
    expect(tests.total).toBe(2);
  });

  it("should parse failing JUnit reports", async () => {
    const tests = await parseJUnitReports([path.join(FIXTURES_DIR, "junit-failed.xml")]);
    expect(tests.status).toBe("FAILED");
    expect(tests.failed).toBe(1);
    expect(tests.passed).toBe(2);
    expect(tests.total).toBe(3);
  });

  it("should return status MISSING when test report is not found", async () => {
    const tests = await parseJUnitReports(["non-existent-test.xml"]);
    expect(tests.status).toBe("MISSING");
    expect(tests.total).toBe(0);
  });

  it("should collect artifacts and compute sha256 hash", async () => {
    const artifacts = await collectArtifacts([path.join(FIXTURES_DIR, "*.dmg")]);
    expect(artifacts.length).toBe(1);
    expect(artifacts[0].name).toBe("dummy-artifact.dmg");
    expect(artifacts[0].sha256).toHaveLength(64);
    expect(artifacts[0].size).toBeGreaterThan(0);
  });
});
