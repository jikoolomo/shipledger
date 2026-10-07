# Security Policy

Oruvena takes the security and integrity of **ShipLedger** seriously. Because ShipLedger functions as a release evidence and trust infrastructure, maintaining strict security boundaries is our top priority.

---

## Supported Versions

Only the latest active minor release is officially supported for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Core Security & Privacy Principles

1. **Zero Source Code Retention:** ShipLedger never stores, inspects, or uploads your private repository source code. It only processes hashes, metadata, SBOMs, test reports, and security findings.
2. **Minimal Permissions:** ShipLedger requires only the minimum GitHub Actions tokens necessary to inspect release metadata and output evidence summaries.
3. **Deterministic Verification:** Policy evaluations and evidence integrity digests are calculated using RFC 8785 Canonical JSON and SHA-256 to ensure tamper-evident evidence.

---

## Reporting a Vulnerability

If you discover a security vulnerability within ShipLedger, please do **NOT** open a public issue.

Instead, please report the vulnerability confidentially:

- **Email:** `security@oruvena.com`
- **PGP/Encrypted Communication:** Available upon request.
- **GitHub Advisory:** You may also use GitHub's private vulnerability reporting feature on the repository: [github.com/oruvena/shipledger/security/advisories/new](https://github.com/oruvena/shipledger/security/advisories/new).

### Information to Include
- Detailed description of the vulnerability.
- Steps to reproduce or proof-of-concept (PoC).
- Affected version(s) of ShipLedger.
- Any potential impact on evidence integrity or CI/CD execution.

### Response Timeline
- **Initial Acknowledgement:** Within 24 hours.
- **Assessment & Triage:** Within 48 hours.
- **Fix & Disclosure:** Coordinated release with reasonable notice (typically within 14–30 days depending on severity).
