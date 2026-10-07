import { NextRequest, NextResponse } from "next/server";
import { verifyGitHubWebhookSignature } from "@shipledger/api";

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.text();
    const event = req.headers.get("x-github-event");
    const signature = req.headers.get("x-hub-signature-256");
    const delivery = req.headers.get("x-github-delivery");

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "dev-webhook-secret";

    // Verify signature if secret is configured
    if (process.env.NODE_ENV === "production" || signature) {
      const isValid = verifyGitHubWebhookSignature(rawPayload, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    const body = rawPayload ? JSON.parse(rawPayload) : {};

    // 1. Ping Event
    if (event === "ping") {
      return NextResponse.json({
        success: true,
        message: "pong",
        zen: body.zen
      });
    }

    // 2. Release Event (Section 37)
    if (event === "release" && body.action === "published") {
      return NextResponse.json({
        success: true,
        status: "processed",
        event: "release",
        action: "published",
        repository: body.repository?.full_name,
        release_tag: body.release?.tag_name,
        commit_sha: body.release?.target_commitish,
        delivery
      });
    }

    // 3. Workflow Run Event (Section 37)
    if (event === "workflow_run" && body.action === "completed") {
      return NextResponse.json({
        success: true,
        status: "processed",
        event: "workflow_run",
        action: "completed",
        run_id: body.workflow_run?.id,
        conclusion: body.workflow_run?.conclusion,
        repository: body.repository?.full_name,
        commit_sha: body.workflow_run?.head_sha,
        delivery
      });
    }

    return NextResponse.json({
      success: true,
      status: "ignored",
      event: event || "unknown",
      action: body.action || "none"
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process webhook" },
      { status: 400 }
    );
  }
}
