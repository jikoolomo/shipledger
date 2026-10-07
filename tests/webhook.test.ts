import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as handleWebhook } from "../apps/web/src/app/api/v1/webhook/github/route.js";
import { verifyGitHubWebhookSignature } from "../packages/api/src/index.js";

const TEST_SECRET = "my-test-webhook-secret-123";

function computeSignature(payload: string, secret: string = TEST_SECRET): string {
  const hash = createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${hash}`;
}

describe("GitHub App Webhook Handler & Security", () => {
  describe("HMAC-SHA256 Signature Verification", () => {
    it("should verify valid webhook signature correctly", () => {
      const payload = JSON.stringify({ action: "published", repository: { name: "tobi" } });
      const signature = computeSignature(payload, TEST_SECRET);

      const isValid = verifyGitHubWebhookSignature(payload, signature, TEST_SECRET);
      expect(isValid).toBe(true);
    });

    it("should reject tampered payload or wrong secret", () => {
      const payload = JSON.stringify({ action: "published" });
      const signature = computeSignature(payload, TEST_SECRET);

      const isTampered = verifyGitHubWebhookSignature(payload + "tamper", signature, TEST_SECRET);
      expect(isTampered).toBe(false);

      const isWrongSecret = verifyGitHubWebhookSignature(payload, signature, "different-secret");
      expect(isWrongSecret).toBe(false);
    });

    it("should reject malformed or missing signature headers", () => {
      expect(verifyGitHubWebhookSignature("{}", null, TEST_SECRET)).toBe(false);
      expect(verifyGitHubWebhookSignature("{}", "invalid-header-without-sha256", TEST_SECRET)).toBe(false);
      expect(verifyGitHubWebhookSignature("{}", "sha256=123", TEST_SECRET)).toBe(false);
    });
  });

  describe("Webhook Events Processing", () => {
    const originalSecret = process.env.GITHUB_WEBHOOK_SECRET;

    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
    });

    afterEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = originalSecret;
    });

    it("should respond to GitHub ping events", async () => {
      const payload = JSON.stringify({ zen: "Design for failure." });
      const signature = computeSignature(payload, TEST_SECRET);

      const req = new Request("http://localhost:3000/api/v1/webhook/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "ping",
          "x-hub-signature-256": signature,
          "x-github-delivery": "delivery-uuid-1"
        },
        body: payload
      });

      const res = await handleWebhook(req as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.message).toBe("pong");
      expect(data.zen).toBe("Design for failure.");
    });

    it("should process release:published events (Section 37)", async () => {
      const payload = JSON.stringify({
        action: "published",
        release: {
          tag_name: "v0.8.3",
          target_commitish: "4dbede734f06f7607337839212d38242401d936d"
        },
        repository: {
          full_name: "oruvena/tobi"
        }
      });
      const signature = computeSignature(payload, TEST_SECRET);

      const req = new Request("http://localhost:3000/api/v1/webhook/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "release",
          "x-hub-signature-256": signature,
          "x-github-delivery": "delivery-uuid-2"
        },
        body: payload
      });

      const res = await handleWebhook(req as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.status).toBe("processed");
      expect(data.event).toBe("release");
      expect(data.release_tag).toBe("v0.8.3");
      expect(data.repository).toBe("oruvena/tobi");
    });

    it("should process workflow_run:completed events (Section 37)", async () => {
      const payload = JSON.stringify({
        action: "completed",
        workflow_run: {
          id: 37624483531,
          conclusion: "success",
          head_sha: "4dbede734f06f7607337839212d38242401d936d"
        },
        repository: {
          full_name: "oruvena/tobi"
        }
      });
      const signature = computeSignature(payload, TEST_SECRET);

      const req = new Request("http://localhost:3000/api/v1/webhook/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "workflow_run",
          "x-hub-signature-256": signature
        },
        body: payload
      });

      const res = await handleWebhook(req as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.status).toBe("processed");
      expect(data.conclusion).toBe("success");
      expect(data.run_id).toBe(37624483531);
    });

    it("should reject requests with invalid signatures", async () => {
      const payload = JSON.stringify({ action: "published" });
      const badSignature = "sha256=0000000000000000000000000000000000000000000000000000000000000000";

      const req = new Request("http://localhost:3000/api/v1/webhook/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "release",
          "x-hub-signature-256": badSignature
        },
        body: payload
      });

      const res = await handleWebhook(req as any);
      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Invalid webhook signature");
    });
  });
});
