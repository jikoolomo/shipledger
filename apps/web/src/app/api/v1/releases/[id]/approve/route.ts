import { NextRequest, NextResponse } from "next/server";
import { recordHumanReleaseApproval } from "@shipledger/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as any;

    const result = recordHumanReleaseApproval({
      releaseId: id,
      currentStatus: body.current_status || body.currentStatus || "READY",
      approvedBy: body.approved_by || body.approvedBy,
      comment: body.comment
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to record human release approval"
      },
      { status: 400 }
    );
  }
}
