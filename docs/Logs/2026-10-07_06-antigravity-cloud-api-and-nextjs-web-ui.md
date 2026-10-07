---
schema: lomo.ai_collab.v1
time: 2026-10-07T20:16:00+07:00
actor: antigravity
role: build
task: phase2-cloud-web-and-api
gate: Phase 2 Cloud Ingestion API & Next.js App Router Web UI
status: completed
base_sha: 16f6a87f156f51695fbbf9d4c7b452ec4c84da6a
head_sha: 572cb3787aa4d50356fb8b8a8ece5a8e46597856
handoff: null
---

## Result

Implemented Phase 2 Cloud SaaS Ingestion API (`@shipledger/api`) and Next.js 16 App Router Web UI (`apps/web`):
1. **`@shipledger/api` Core Modules:**
   - `oidc.ts`: GitHub Actions OIDC JWT token verification (`jose` library) validating audience (`https://shipledger.oruvena.com`), repository, and commit SHA with dev/test bypass support.
   - `ingestion.ts`: Release Evidence Bundle validation, cryptographic SHA-256 canonical digest verification (RFC 8785 Section 27), and OIDC claims binding into Cloud Evidence Vault.
   - `decision.ts`: Human risk acceptance (`recordRiskDecision`, mandatory reason and expiry dates Section 16) and human release approval (`recordHumanReleaseApproval`, restricted to `READY` status Section 20).
2. **Next.js App Router Web UI (`apps/web`):**
   - 5 core screen routes matching specification:
     - `/` Overview: Top metrics, recent releases audit table.
     - `/repositories`: Connected GitHub repositories, coverage, branch pointers.
     - `/releases/[id]`: Central Release Evidence Vault, status badges (`READY`, `REVIEW_REQUIRED`, `INCOMPLETE`), Evidence verification matrix, Artifact SHA-256 hashes, Release Diff, RFC 8785 digest verification.
     - `/findings`: Vulnerability catalog, severity filtering, human risk acceptance records.
     - `/settings`: GitHub OIDC token ingestion settings, CRA readiness contacts.
   - Route Handler: `POST /api/v1/evidence` connecting directly to `@shipledger/api/ingestion`.
3. **Automated Verification:**
   - Vitest test suite expanded to 36 tests across 8 test suites (`tests/cloud-api.test.ts` covering OIDC verification, tampering rejection, schema validation, risk decisions, status gates, and HTTP Route Handler).
   - Zero TypeScript errors (`tsc --noEmit`).
   - Production Next.js build verified (`next build apps/web --webpack`).

## Validation

- `pnpm typecheck`: Exit 0 (Clean TypeScript check across all packages, web app, and tests).
- `pnpm test`: Exit 0 (36 tests passed, including real Tovi SBOM 994 components dogfooding and cloud ingestion tests).
- `pnpm build`: Exit 0 (tsup generated Action `dist/action/index.cjs` and CLI `dist/cli/index.js`).
- `pnpm web:build`: Exit 0 (Next.js compiled all 7 static & dynamic routes).

## Risk and next step

- Task `phase2-cloud-web-and-api` complete.
- Next step: Git commit and push to remote `github.com/jikoolomo/shipledger`.
