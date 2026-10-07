import { computeEvidenceDigest } from "@shipledger/crypto";
import { ReleaseEvidenceBundleSchema, type ReleaseEvidenceBundle } from "@shipledger/schema";
import { verifyGitHubOidcToken, type GitHubOidcClaims } from "./oidc.js";

export interface IngestEvidenceInput {
  rawEvidence: unknown;
  oidcToken?: string;
  allowDevBypass?: boolean;
}

export interface IngestEvidenceResult {
  success: boolean;
  release: {
    repository: string;
    commit_sha: string;
    tag?: string;
    status: string;
  };
  integrity: {
    verified: boolean;
    evidence_digest: string;
  };
  claims?: GitHubOidcClaims;
  message: string;
}

/**
 * Validates, authenticates, and ingests an incoming Release Evidence Bundle into Cloud Evidence Vault.
 */
export async function ingestEvidenceBundle(input: IngestEvidenceInput): Promise<IngestEvidenceResult> {
  const { rawEvidence, oidcToken, allowDevBypass = false } = input;

  // 1. Zod Schema Validation
  const parseResult = ReleaseEvidenceBundleSchema.safeParse(rawEvidence);
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
    throw new Error(`Invalid Release Evidence Bundle schema: ${errors}`);
  }

  const bundle: ReleaseEvidenceBundle = parseResult.data;

  // 2. Cryptographic Integrity Digest Verification (Section 27)
  const computedDigest = computeEvidenceDigest(rawEvidence as Record<string, unknown>);
  if (computedDigest !== bundle.integrity.evidence_digest) {
    throw new Error(
      `Tampered evidence bundle! Computed digest '${computedDigest}' does not match bundle's declared digest '${bundle.integrity.evidence_digest}'`
    );
  }

  // 3. OIDC Authentication Verification (Section 36)
  let claims: GitHubOidcClaims | undefined;
  if (oidcToken) {
    claims = await verifyGitHubOidcToken({
      token: oidcToken,
      expectedRepository: bundle.release.repository,
      expectedSha: bundle.release.commit_sha,
      allowDevBypass
    });
  }

  // 4. Return Normalized Ingestion Summary
  return {
    success: true,
    release: {
      repository: bundle.release.repository,
      commit_sha: bundle.release.commit_sha,
      tag: bundle.release.tag,
      status: bundle.policy.status
    },
    integrity: {
      verified: true,
      evidence_digest: bundle.integrity.evidence_digest
    },
    claims,
    message: `Evidence bundle for ${bundle.release.repository}@${bundle.release.commit_sha.substring(0, 7)} ingested successfully into Evidence Vault.`
  };
}
