import type { RiskAcceptance } from "@shipledger/schema";

export interface RecordRiskDecisionInput {
  findingId: string;
  reason: string;
  approvedBy: string;
  expiresAt: string; // ISO date string
  now?: Date;
}

export interface RecordRiskDecisionResult {
  decision: RiskAcceptance;
  audit: {
    action: "risk_accepted";
    who: string;
    resource: string;
    reason: string;
    expires_at: string;
    timestamp: string;
  };
}

export function recordRiskDecision(input: RecordRiskDecisionInput): RecordRiskDecisionResult {
  const { findingId, reason, approvedBy, expiresAt, now = new Date() } = input;

  if (!reason || reason.trim().length === 0) {
    throw new Error("Risk acceptance reason is mandatory and cannot be empty (Section 16)");
  }

  if (!approvedBy || approvedBy.trim().length === 0) {
    throw new Error("Approver name/ID is required for risk acceptance");
  }

  const expiryDate = new Date(expiresAt);
  if (isNaN(expiryDate.getTime())) {
    throw new Error("Invalid expiration date format");
  }

  if (expiryDate <= now) {
    throw new Error("Risk acceptance expiry date must be in the future");
  }

  const decision: RiskAcceptance = {
    finding: findingId,
    decision: "RISK_ACCEPTED",
    reason: reason.trim(),
    approved_by: approvedBy.trim(),
    created_at: now.toISOString(),
    expires_at: expiryDate.toISOString()
  };

  return {
    decision,
    audit: {
      action: "risk_accepted",
      who: approvedBy.trim(),
      resource: `finding:${findingId}`,
      reason: reason.trim(),
      expires_at: expiryDate.toISOString(),
      timestamp: now.toISOString()
    }
  };
}

export interface RecordApprovalInput {
  releaseId: string;
  currentStatus: string;
  approvedBy: string;
  comment?: string;
  now?: Date;
}

export interface RecordApprovalResult {
  previousStatus: string;
  newStatus: "APPROVED";
  approvedBy: string;
  comment?: string;
  timestamp: string;
}

export function recordHumanReleaseApproval(input: RecordApprovalInput): RecordApprovalResult {
  const { releaseId, currentStatus, approvedBy, comment, now = new Date() } = input;

  if (currentStatus !== "READY") {
    throw new Error(
      `Cannot approve release '${releaseId}': Current status is '${currentStatus}'. Only releases in 'READY' status can be approved (Section 20).`
    );
  }

  if (!approvedBy || approvedBy.trim().length === 0) {
    throw new Error("Approver name/ID is required for final release approval");
  }

  return {
    previousStatus: currentStatus,
    newStatus: "APPROVED",
    approvedBy: approvedBy.trim(),
    comment: comment?.trim(),
    timestamp: now.toISOString()
  };
}
