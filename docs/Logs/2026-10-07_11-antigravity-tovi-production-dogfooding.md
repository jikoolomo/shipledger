---
schema: lomo.ai_collab.v1
time: 2026-10-07T23:00:20+07:00
actor: antigravity
role: dogfooding
task: tovi-production-dogfooding-integration
gate: Real-world Dogfooding Integration on Tovi Production Repo
status: completed
base_sha: f71addee242703930995693e6b0d1d4dcd14d59b
head_sha: f71addee242703930995693e6b0d1d4dcd14d59b
handoff: null
---

## Result

Executed real-world Dogfooding integration of ShipLedger onto the production repository `Tovi` (`/Users/jikoolomo/Developer/Tovi-socialplans`):
1. **Tovi Configuration (`.shipledger.yml`):**
   - Configured product ID `tovi`, baseline profile, advisory mode, and CycloneDX SBOM reference (`sbom.cdx.json`).
   - Defined vulnerability policies (`block_critical`, `review_high`, `review_known_exploited`).
2. **GitHub Actions Workflow (`.github/workflows/shipledger-evidence.yml`):**
   - Automated CycloneDX SBOM generation on release tags (`v*`).
   - Integrated `jikoolomo/shipledger@v1` Action gate and evidence artifact upload (`shipledger-evidence.json`, `shipledger-evidence.md`).
3. **Real-world Bundle Generation & Integrity Verification:**
   - Evaluated 994 real npm components from Tovi's production dependencies.
   - Pinned commit `efada65`, verified zero critical/high/known-exploited vulnerabilities via OSV.
   - Generated canonical evidence bundle (`shipledger-evidence.json`) with SHA-256 Digest `7287c651212dce97fcf2af1ea0e5311b821a09b1f4c3870ce9d8b76e9afc4291`.
   - Verified digest integrity using `shipledger verify` (Exit 0: VERIFIED).
4. **Clean Workspace Isolation:**
   - Isolated ShipLedger evidence files in Tovi's `.gitignore` without altering ongoing mobile application branch work (`feat/business-booking-web`).

## Validation

- `node /Users/jikoolomo/Developer/ShipLedger/dist/cli/index.js run -c .shipledger.yml` in Tovi: Exit 0 (advisory mode, evidence generated).
- `node /Users/jikoolomo/Developer/ShipLedger/dist/cli/index.js verify shipledger-evidence.json` in Tovi: Exit 0 (`✓ VERIFIED: Evidence digest matches (7287c651...)`).
- Tovi `.gitignore`: Updated with release evidence artifacts.

## Risk and next step

- Task `tovi-production-dogfooding-integration` complete.
- ShipLedger engine validated against large real-world production monorepo SBOM.
