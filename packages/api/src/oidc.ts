import { createRemoteJWKSet, jwtVerify } from "jose";

export interface GitHubOidcClaims {
  iss: string;
  sub: string;
  aud: string;
  repository: string;
  repository_owner: string;
  sha: string;
  ref: string;
  actor: string;
  run_id: string;
  workflow: string;
  [key: string]: unknown;
}

export interface VerifyOidcOptions {
  token: string;
  expectedAudience?: string;
  expectedRepository?: string;
  expectedSha?: string;
  jwksUrl?: string;
  allowDevBypass?: boolean;
}

const GITHUB_JWKS_URL = "https://token.actions.githubusercontent.com/.well-known/jwks";
const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getGitHubJwks(url: string = GITHUB_JWKS_URL) {
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(new URL(url));
  }
  return remoteJwks;
}

/**
 * Verifies a GitHub Actions OIDC JWT token and validates audience, repository, and commit SHA.
 */
export async function verifyGitHubOidcToken(options: VerifyOidcOptions): Promise<GitHubOidcClaims> {
  const {
    token,
    expectedAudience,
    expectedRepository,
    expectedSha,
    jwksUrl = GITHUB_JWKS_URL,
    allowDevBypass = false
  } = options;

  let claims: GitHubOidcClaims;

  // Development / Test bypass token
  if (allowDevBypass && token.startsWith("dev-mock-token:")) {
    const parts = token.replace("dev-mock-token:", "").split(";");
    const repo = parts[0] || expectedRepository || "local/repo";
    const sha = parts[1] || expectedSha || "0000000000000000000000000000000000000000";

    claims = {
      iss: GITHUB_ISSUER,
      sub: `repo:${repo}:ref:refs/heads/main`,
      aud: expectedAudience || "https://shipledger.oruvena.com",
      repository: repo,
      repository_owner: repo.split("/")[0] || "dev",
      sha,
      ref: "refs/heads/main",
      actor: "dev-user",
      run_id: "000000",
      workflow: "dev-verification"
    };
  } else {
    const JWKS = getGitHubJwks(jwksUrl);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: GITHUB_ISSUER,
      audience: expectedAudience
    });

    claims = payload as unknown as GitHubOidcClaims;
  }

  // 1. Verify Repository match
  if (expectedRepository && claims.repository !== expectedRepository) {
    throw new Error(
      `OIDC repository mismatch: Token claimed '${claims.repository}', but evidence specified '${expectedRepository}'`
    );
  }

  // 2. Verify Commit SHA match
  if (expectedSha && claims.sha !== expectedSha) {
    throw new Error(
      `OIDC commit SHA mismatch: Token claimed '${claims.sha}', but evidence specified '${expectedSha}'`
    );
  }

  return claims;
}
