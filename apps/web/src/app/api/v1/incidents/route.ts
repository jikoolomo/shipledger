import { NextRequest, NextResponse } from "next/server";

export interface IncidentRecord {
  id: string;
  release_id: string;
  release_tag: string;
  repository: string;
  type: "ACTIVELY_EXPLOITED_VULNERABILITY" | "SEVERE_SECURITY_INCIDENT" | "OTHER";
  title: string;
  impact_summary: string;
  mitigation_status: string;
  confirmed_by: string;
  confirmed_awareness_time: string;
  deadlines: {
    early_warning_24h: string;
    early_warning_remaining_hours: number;
    early_warning_status: "PENDING" | "SUBMITTED" | "OVERDUE";
    full_notification_72h: string;
    full_notification_remaining_hours: number;
    full_notification_status: "PENDING" | "SUBMITTED" | "OVERDUE";
  };
  enisa_srp_ready: boolean;
  created_at: string;
}

// In-memory or simulated database state for Cloud SaaS API
const initialIncidents: IncidentRecord[] = [
  {
    id: "inc-cra-2026-001",
    release_id: "rel-production-v0.8.3",
    release_tag: "v0.8.3",
    repository: "oruvena/tobi",
    type: "ACTIVELY_EXPLOITED_VULNERABILITY",
    title: "CVE-2026-3391 remote unauthenticated memory corruption in bundled lib",
    impact_summary: "High risk of RCE if malicious payload sent to parser endpoint.",
    mitigation_status: "Patch v0.8.4 prepared; testing in staging.",
    confirmed_by: "Security Lead (lead@oruvena.com)",
    confirmed_awareness_time: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), // 10 hours ago
    deadlines: {
      early_warning_24h: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
      early_warning_remaining_hours: 14,
      early_warning_status: "PENDING",
      full_notification_72h: new Date(Date.now() + 62 * 3600 * 1000).toISOString(),
      full_notification_remaining_hours: 62,
      full_notification_status: "PENDING"
    },
    enisa_srp_ready: true,
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  }
];

export async function GET() {
  // Calculate real-time remaining countdowns
  const now = Date.now();
  const list = initialIncidents.map((inc) => {
    const awareness = new Date(inc.confirmed_awareness_time).getTime();
    const d24 = awareness + 24 * 3600 * 1000;
    const d72 = awareness + 72 * 3600 * 1000;

    const remaining24 = Math.round((d24 - now) / (3600 * 1000));
    const remaining72 = Math.round((d72 - now) / (3600 * 1000));

    return {
      ...inc,
      deadlines: {
        early_warning_24h: new Date(d24).toISOString(),
        early_warning_remaining_hours: remaining24,
        early_warning_status: remaining24 < 0 ? ("OVERDUE" as const) : ("PENDING" as const),
        full_notification_72h: new Date(d72).toISOString(),
        full_notification_remaining_hours: remaining72,
        full_notification_status: remaining72 < 0 ? ("OVERDUE" as const) : ("PENDING" as const)
      }
    };
  });

  return NextResponse.json({
    incidents: list,
    count: list.length,
    regulation: "EU Cyber Resilience Act (CRA) Article 14",
    deadlines_rule: "24h Early Warning + 72h Full Notification from confirmed Awareness Time"
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as any;
    const {
      release_id,
      release_tag,
      repository,
      type,
      title,
      impact_summary,
      mitigation_status,
      confirmed_by,
      confirmed_awareness_time
    } = body;

    if (!title || !type || !confirmed_awareness_time) {
      return NextResponse.json(
        { error: "title, type, and confirmed_awareness_time are required" },
        { status: 400 }
      );
    }

    const awarenessDate = new Date(confirmed_awareness_time);
    if (isNaN(awarenessDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid ISO timestamp for confirmed_awareness_time" },
        { status: 400 }
      );
    }

    const d24 = new Date(awarenessDate.getTime() + 24 * 3600 * 1000);
    const d72 = new Date(awarenessDate.getTime() + 72 * 3600 * 1000);
    const now = Date.now();

    const remaining24 = Math.round((d24.getTime() - now) / (3600 * 1000));
    const remaining72 = Math.round((d72.getTime() - now) / (3600 * 1000));

    const newIncident: IncidentRecord = {
      id: `inc-cra-${Date.now().toString(36)}`,
      release_id: release_id || "rel-custom",
      release_tag: release_tag || "v1.0.0",
      repository: repository || "oruvena/custom",
      type: type || "ACTIVELY_EXPLOITED_VULNERABILITY",
      title,
      impact_summary: impact_summary || "Impact evaluation in progress.",
      mitigation_status: mitigation_status || "Investigation underway.",
      confirmed_by: confirmed_by || "Responsible Reviewer",
      confirmed_awareness_time: awarenessDate.toISOString(),
      deadlines: {
        early_warning_24h: d24.toISOString(),
        early_warning_remaining_hours: remaining24,
        early_warning_status: remaining24 < 0 ? "OVERDUE" : "PENDING",
        full_notification_72h: d72.toISOString(),
        full_notification_remaining_hours: remaining72,
        full_notification_status: remaining72 < 0 ? "OVERDUE" : "PENDING"
      },
      enisa_srp_ready: true,
      created_at: new Date().toISOString()
    };

    initialIncidents.unshift(newIncident);

    return NextResponse.json({
      incident: newIncident,
      message: "CRA Article 14 incident recorded. Deadlines calculated based on confirmed awareness time."
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
