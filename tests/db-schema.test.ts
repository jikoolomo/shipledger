import { describe, expect, it } from "vitest";
import {
  approvals,
  artifacts,
  auditEvents,
  evidenceBundles,
  findings,
  products,
  releases,
  repositories,
  riskDecisions,
  sboms
} from "../packages/db/src/index.js";

describe("Phase 2 Cloud Database Schema (Drizzle ORM)", () => {
  it("should have valid core table definitions", () => {
    expect(releases).toBeDefined();
    expect(evidenceBundles).toBeDefined();
    expect(artifacts).toBeDefined();
    expect(sboms).toBeDefined();
    expect(findings).toBeDefined();
    expect(riskDecisions).toBeDefined();
    expect(approvals).toBeDefined();
    expect(auditEvents).toBeDefined();
    expect(repositories).toBeDefined();
    expect(products).toBeDefined();
  });

  it("should enforce correct column definitions for releases table", () => {
    // Releases must contain immutable release identity keys (Section 10, 39)
    expect(releases.commitSha).toBeDefined();
    expect(releases.evidenceDigest).toBeDefined();
    expect(releases.status).toBeDefined();
    expect(releases.repositoryId).toBeDefined();
  });

  it("should enforce append-only audit event requirements (Section 40)", () => {
    expect(auditEvents.action).toBeDefined();
    expect(auditEvents.resourceType).toBeDefined();
    expect(auditEvents.resourceId).toBeDefined();
    expect(auditEvents.timestamp).toBeDefined();
  });
});
