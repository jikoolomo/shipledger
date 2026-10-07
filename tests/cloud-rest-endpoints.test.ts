import { describe, expect, it } from "vitest";
import { GET as getHealth } from "../apps/web/src/app/api/v1/health/route.js";
import { GET as getRepositories } from "../apps/web/src/app/api/v1/repositories/route.js";
import { GET as getRepoReleases } from "../apps/web/src/app/api/v1/repositories/[id]/releases/route.js";
import { GET as getReleaseDetail } from "../apps/web/src/app/api/v1/releases/[id]/route.js";
import { GET as getReleaseEvidence } from "../apps/web/src/app/api/v1/releases/[id]/evidence/route.js";
import { POST as postFindingDecision } from "../apps/web/src/app/api/v1/findings/[id]/decision/route.js";
import { POST as postReleaseApproval } from "../apps/web/src/app/api/v1/releases/[id]/approve/route.js";

describe("ShipLedger Cloud REST API Endpoints (Section 37)", () => {
  it("GET /api/v1/health should return service health", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe("healthy");
    expect(data.service).toBe("shipledger-cloud");
    expect(data.version).toBe("0.1.0");
  });

  it("GET /api/v1/repositories should list connected repositories", async () => {
    const res = await getRepositories();
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.count).toBeGreaterThan(0);
    expect(data.repositories[0].name).toBe("oruvena/tobi");
    expect(data.repositories[0].latest_release.status).toBe("READY");
  });

  it("GET /api/v1/repositories/:id/releases should return releases for repository", async () => {
    const req = new Request("http://localhost:3000/api/v1/repositories/repo-tobi/releases");
    const res = await getRepoReleases(req as any, { params: Promise.resolve({ id: "repo-tobi" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.repository_id).toBe("repo-tobi");
    expect(data.releases.length).toBeGreaterThan(0);
    expect(data.releases[0].version).toBe("v0.8.3");
  });

  it("GET /api/v1/releases/:id should return release details and verification matrix", async () => {
    const req = new Request("http://localhost:3000/api/v1/releases/rel-001");
    const res = await getReleaseDetail(req as any, { params: Promise.resolve({ id: "rel-001" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe("rel-001");
    expect(data.status).toBe("READY");
    expect(data.completeness.percentage).toBe("100%");
  });

  it("GET /api/v1/releases/:id/evidence should return raw evidence bundle and digest", async () => {
    const req = new Request("http://localhost:3000/api/v1/releases/rel-001/evidence");
    const res = await getReleaseEvidence(req as any, { params: Promise.resolve({ id: "rel-001" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.release_id).toBe("rel-001");
    expect(data.evidence_digest).toBeDefined();
    expect(data.bundle.schema_version).toBe("shipledger.evidence.v1");
  });

  it("POST /api/v1/findings/:id/decision should record risk decision with valid parameters", async () => {
    const req = new Request("http://localhost:3000/api/v1/findings/GHSA-test/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "Test risk acceptance justification",
        approved_by: "sec-admin@oruvena.com",
        expires_at: "2026-11-06T12:00:00Z"
      })
    });

    const res = await postFindingDecision(req as any, { params: Promise.resolve({ id: "GHSA-test" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.decision.finding).toBe("GHSA-test");
    expect(data.decision.decision).toBe("RISK_ACCEPTED");
  });

  it("POST /api/v1/findings/:id/decision should return 400 when reason is missing (§16)", async () => {
    const req = new Request("http://localhost:3000/api/v1/findings/GHSA-test/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "",
        approved_by: "sec-admin",
        expires_at: "2026-11-06T12:00:00Z"
      })
    });

    const res = await postFindingDecision(req as any, { params: Promise.resolve({ id: "GHSA-test" }) });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain("Risk acceptance reason is mandatory");
  });

  it("POST /api/v1/releases/:id/approve should record approval when release status is READY (§20)", async () => {
    const req = new Request("http://localhost:3000/api/v1/releases/rel-ready/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_status: "READY",
        approved_by: "lead-dev@oruvena.com",
        comment: "QA verified"
      })
    });

    const res = await postReleaseApproval(req as any, { params: Promise.resolve({ id: "rel-ready" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.newStatus).toBe("APPROVED");
    expect(data.approvedBy).toBe("lead-dev@oruvena.com");
  });

  it("POST /api/v1/releases/:id/approve should return 400 when status is not READY (§20)", async () => {
    const req = new Request("http://localhost:3000/api/v1/releases/rel-review/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_status: "REVIEW_REQUIRED",
        approved_by: "lead-dev@oruvena.com"
      })
    });

    const res = await postReleaseApproval(req as any, { params: Promise.resolve({ id: "rel-review" }) });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain("Only releases in 'READY' status can be approved");
  });
});
