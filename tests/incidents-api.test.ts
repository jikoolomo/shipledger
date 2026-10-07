import { describe, it, expect } from "vitest";
import { GET as getIncidents, POST as postIncident } from "../apps/web/src/app/api/v1/incidents/route";
import { GET as getDossier } from "../apps/web/src/app/api/v1/incidents/[id]/dossier/route";
import { NextRequest } from "next/server";

describe("CRA Article 14 Incidents API", () => {
  it("should return incident list and calculate CRA deadlines", async () => {
    const res = await getIncidents();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.regulation).toContain("Article 14");
    expect(Array.isArray(data.incidents)).toBe(true);

    if (data.incidents.length > 0) {
      const first = data.incidents[0];
      expect(first.deadlines.early_warning_24h).toBeDefined();
      expect(first.deadlines.full_notification_72h).toBeDefined();
      expect(typeof first.deadlines.early_warning_remaining_hours).toBe("number");
    }
  });

  it("should create a new CRA incident with confirmed awareness time", async () => {
    const now = new Date();
    const req = new NextRequest("http://localhost:3000/api/v1/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "CVE-2026-9999 Actively Exploited In-The-Wild",
        type: "ACTIVELY_EXPLOITED_VULNERABILITY",
        confirmed_awareness_time: now.toISOString(),
        impact_summary: "Severe privilege escalation",
        mitigation_status: "Hotfix deployed",
        confirmed_by: "Security Officer"
      })
    });

    const res = await postIncident(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.incident.id).toBeDefined();
    expect(data.incident.type).toBe("ACTIVELY_EXPLOITED_VULNERABILITY");
    expect(data.incident.deadlines.early_warning_remaining_hours).toBe(24);
    expect(data.incident.deadlines.full_notification_remaining_hours).toBe(72);
  });

  it("should reject incident creation when awareness time is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Missing awareness timestamp",
        type: "ACTIVELY_EXPLOITED_VULNERABILITY"
      })
    });

    const res = await postIncident(req);
    expect(res.status).toBe(400);
  });

  it("should generate ENISA SRP compatible dossier in markdown format", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/incidents/inc-cra-2026-001/dossier?format=markdown");
    const res = await getDossier(req, {
      params: Promise.resolve({ id: "inc-cra-2026-001" })
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("CRA Article 14 Incident Dossier");
    expect(text).toContain("ENISA Single Reporting Platform (SRP)");
    expect(text).toContain("24h Early Warning Deadline");
  });
});
