import { NextRequest, NextResponse } from "next/server";
import { recordRiskDecision } from "@shipledger/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as any;

    const result = recordRiskDecision({
      findingId: id,
      reason: body.reason,
      approvedBy: body.approved_by || body.approvedBy,
      expiresAt: body.expires_at || body.expiresAt
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to record risk acceptance decision"
      },
      { status: 400 }
    );
  }
}
