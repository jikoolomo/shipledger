import { NextRequest, NextResponse } from "next/server";
import { ingestEvidenceBundle } from "@shipledger/api";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let oidcToken: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      oidcToken = authHeader.substring(7);
    }

    const body = (await req.json()) as any;
    const rawEvidence = body?.evidence || body;
    if (body?.oidcToken) {
      oidcToken = body.oidcToken;
    }

    const allowDevBypass = process.env.NODE_ENV !== "production";

    const result = await ingestEvidenceBundle({
      rawEvidence,
      oidcToken,
      allowDevBypass
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to ingest release evidence bundle"
      },
      { status: 400 }
    );
  }
}
