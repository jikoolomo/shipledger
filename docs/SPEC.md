# ORUVENA SHIPLEDGER

**Tagline:** Every release leaves evidence.

**Product Type:** Developer Tool / Release Evidence Infrastructure / CRA Readiness Layer

**Company:** Oruvena

**Working URL:** `shipledger.oruvena.com`

**Public GitHub:** `github.com/oruvena/shipledger`

---

# 0. 한 문장 정의

ShipLedger는 소프트웨어가 릴리즈될 때마다

**무엇이 배포되었고 → 무엇으로 구성되었으며 → 어떤 테스트와 보안 상태를 통과했고 → 어떤 위험이 발견되었으며 → 어떤 판단을 거쳐 출시되었는지**

자동으로 수집하고 검증 가능한 Release Evidence로 남기는 시스템이다.

CRA는 ShipLedger의 첫 번째 시장 진입점이지 제품 자체의 한계가 아니다.

---

# 1. 왜 만드는가

AI coding agent의 발전으로 코드 작성 비용은 급격하게 떨어진다.

앞으로 개발 흐름은 점점 다음과 같아진다.

```text
Human
 ↓
Codex / Claude / Gemini / Other Agents
 ↓
Code
 ↓
PR
 ↓
CI
 ↓
Tests
 ↓
Build
 ↓
?????
 ↓
Production
```

`?????`에 필요한 것이 ShipLedger다.

질문은 더 이상 단순히

> 테스트가 통과했는가?

가 아니다.

다음 질문에 답할 수 있어야 한다.

```text
정확히 어떤 commit이 배포됐는가?

어떤 artifact가 배포됐는가?

그 artifact의 hash는 무엇인가?

어떤 dependency가 포함돼 있었는가?

당시 알려진 취약점은 무엇이었는가?

테스트는 무엇을 통과했는가?

새로운 dependency가 추가됐는가?

위험을 누가 검토했는가?

왜 그 위험을 허용했는가?

언제 배포됐는가?

이후 발견된 취약점은 어떤 버전에 영향을 주는가?
```

ShipLedger는 이 질문들에 **나중에 AI가 추측해서 답하게 하지 않는다.**

릴리즈 시점에 증거를 만들어 둔다.

이는 Oruvena 원칙의 `Context + Workflow + Data + Permission + Execution + Verification`을 제품으로 구현하는 것이다.

---

# 2. 첫 번째 시장: EU Cyber Resilience Act

CRA는 첫 번째 Distribution Wedge다.

현재 공식 일정상:

- CRA Article 14 보고 의무: **2026-09-11 적용 시작**
- CRA 전체 주요 의무: **2027-12-11 전면 적용**

ENISA의 CRA Single Reporting Platform도 2026-09-11 실제 운영을 시작했다.

현재 제조자가 알아야 하는 actively exploited vulnerability 또는 severe incident에는 24시간 early warning과 72시간 full notification 등의 보고 흐름이 존재한다.

CRA 기술문서는 제품이 시장에 나오기 전에 작성되고 필요하면 지원기간 동안 지속적으로 업데이트되어야 한다.

따라서 ShipLedger 초기 메시지는:

> **CRA release evidence for small software teams.**

하지만 제품 이름에 CRA를 넣지 않는다.

---

# 3. 절대로 하지 말아야 할 것

ShipLedger는 다음 제품이 아니다.

### 3.1 CRA 인증 서비스가 아니다

ShipLedger는 절대로 다음 표시를 하지 않는다.

```text
CRA COMPLIANT ✓
EU CERTIFIED ✓
LEGAL COMPLIANCE GUARANTEED ✓
```

대신:

```text
Evidence complete
Review required
Evidence missing
Risk accepted
Release recorded
```

를 사용한다.

---

### 3.2 보안 스캐너를 새로 만들지 않는다

Snyk, OSV, Syft, Trivy, GitHub, CycloneDX 같은 기존 ecosystem과 경쟁하지 않는다.

ShipLedger 역할:

```text
Scanner
 ↓
Result
 ↓
SHIPLEDGER
 ↓
Evidence
 ↓
Decision
 ↓
History
```

이다.

---

### 3.3 CI/CD 플랫폼을 만들지 않는다

GitHub Actions를 대체하지 않는다.

ShipLedger는 CI 결과를 소비한다.

---

### 3.4 AI 코드 리뷰 제품이 아니다

코드를 잘 작성했는지 AI에게 물어보는 제품이 아니다.

---

### 3.5 프로젝트 관리 기능을 넣지 않는다

Task, Sprint, Roadmap, Project board 금지.

---

### 3.6 v1에는 Chat UI를 만들지 않는다

사용자는 AI와 대화하고 싶은 것이 아니다.

사용자는

> 이 릴리즈에 문제가 있는가?

만 알고 싶다.

---

# 4. 핵심 Outcome

사용자가 ShipLedger에 돈을 내는 이유는:

> **“우리가 출시한 모든 버전을 나중에 설명하고 증명할 수 있는 상태.”**

CRA 고객에게는:

> **“CRA 관련 release evidence와 vulnerability history가 항상 준비된 상태.”**

AI 시대 장기 Outcome은:

> **“사람이나 AI Agent가 만든 소프트웨어가 검증 가능한 release gate를 통과해서 production으로 나가는 상태.”**

---

# 5. Product Architecture

전체 구조:

```text
                 SOURCE

                GitHub
                  │
                  │
        ┌─────────▼─────────┐
        │   GitHub Actions   │
        └─────────┬─────────┘
                  │
          Build / Test / SBOM
                  │
                  ▼
        ┌───────────────────┐
        │     SHIPLEDGER     │
        │      ACTION        │
        └─────────┬─────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼

 Release      Security      Evidence
 Identity     Findings       Inputs

      └───────────┬───────────┘
                  ▼

         POLICY ENGINE

                  ↓

        READY / REVIEW
        / INCOMPLETE

                  ↓

         EVIDENCE BUNDLE

                  ↓

       ┌──────────┴──────────┐
       │                     │

 GitHub Artifact        ShipLedger Cloud
                              │
                              ▼

                       Evidence Vault
                              │
                         Monitoring
                              │
                       Incident Workflow
```

---

# 6. 제품은 2층 구조로 만든다

## Layer A — ShipLedger Open Engine

무료 / 오픈소스.

GitHub Action과 CLI.

책임:

```text
Evidence 수집
Evidence validation
Policy evaluation
Evidence bundle 생성
Hash 생성
GitHub summary 생성
```

사용자가 Cloud 없이도 사용할 수 있어야 한다.

---

## Layer B — ShipLedger Cloud

유료 SaaS.

책임:

```text
Evidence 장기 보관
Release history
SBOM history
Vulnerability monitoring
Risk decision history
Organization approval
CRA incident workspace
Notifications
Audit export
```

Open Engine이 없어도 Cloud가 존재해서는 안 된다.

Cloud는 Engine의 결과를 확장하는 것이다.

---

# 7. Repository 구조

두 개로 나눈다.

## Public Repository

```text
oruvena/shipledger
```

내용:

```text
/action.yml

/src
  /action
  /cli

/packages
  /schema
  /core
  /policy
  /parsers
  /crypto

/schemas

/examples

/docs

/tests
```

MIT 또는 Apache-2.0 검토.

---

## Private Repository

```text
oruvena/shipledger-cloud
```

내용:

```text
/apps
  /web
  /worker

/packages
  /db
  /api
  /auth
  /billing
  /github
  /monitoring
```

---

# 8. 기술 스택

## Open Engine

```text
Language: TypeScript

Node Runtime:
Node 24

Package manager:
pnpm

Schema validation:
Zod + JSON Schema

Testing:
Vitest

GitHub:
@actions/core
@actions/github

Bundling:
@ncc 또는 동등한 single bundle builder
```

GitHub는 현재 JavaScript Action에 `node24` runtime을 공식 지원한다.

---

## Cloud

```text
Frontend:
Next.js App Router
TypeScript

Database:
PostgreSQL

ORM:
Drizzle ORM

Background Jobs:
PostgreSQL-backed queue
예: pg-boss 계열

Object Storage:
S3-compatible storage

Authentication:
GitHub login

Repository authorization:
GitHub App

Styling:
Tailwind CSS

Validation:
Zod
```

초기에는 Redis를 추가하지 않는다.

---

# 9. 핵심 데이터 원칙

가장 중요한 원칙:

> **ShipLedger는 고객의 source code를 저장하지 않는다.**

가능한 한 다음만 저장한다.

```text
repository metadata
commit SHA
release tag
artifact hashes
dependency identifiers
SBOM
test results
security findings
risk decisions
approvals
timestamps
evidence digests
```

Private source code는 Cloud에 보내지 않는다.

---

# 10. Release Identity

모든 release는 다음을 기준으로 식별한다.

```text
repository_id
commit_sha
release_tag
workflow_run_id
created_at
```

`main`

`HEAD`

처럼 mutable pointer를 evidence identity로 사용하면 안 된다.

반드시 immutable commit SHA를 기록한다.

---

# 11. Release Evidence Bundle

ShipLedger 핵심 asset.

파일:

```text
shipledger-evidence.json
shipledger-evidence.md
shipledger-manifest.json
```

JSON 기본 구조:

```json
{
  "schema_version": "shipledger.evidence.v1",

  "release": {
    "repository": "oruvena/tobi",
    "commit_sha": "...",
    "tag": "v0.8.3",
    "workflow_run_id": "...",
    "created_at": "..."
  },

  "source": {
    "branch": "main",
    "actor": "...",
    "trigger": "release"
  },

  "artifacts": [],

  "tests": {},

  "sbom": {},

  "vulnerabilities": [],

  "changes": {},

  "policy": {},

  "risk_decisions": [],

  "approvals": [],

  "integrity": {}
}
```

---

# 12. Artifact Evidence

사용자가 config에 artifact를 지정한다.

예:

```yaml
artifacts:
  - dist/*.dmg
  - dist/*.zip
```

ShipLedger:

```text
filename
size
SHA-256
creation timestamp
```

을 기록한다.

예:

```json
{
  "name": "Tobi-0.8.3.dmg",
  "sha256": "...",
  "size": 94837422
}
```

artifact 자체는 기본적으로 Cloud에 업로드하지 않는다.

hash만 저장한다.

---

# 13. SBOM

ShipLedger는 첫 버전에서 자체 SBOM generator를 만들지 않는다.

지원 포맷:

```text
CycloneDX JSON
SPDX JSON
```

사용자가:

```yaml
sbom:
  path: ./sbom.cdx.json
```

으로 제공한다.

ShipLedger는:

```text
SBOM 존재 여부
format
schema validation
components
package URL
versions
```

을 읽는다.

SBOM이 없으면:

```text
Evidence Missing
```

이지

```text
Safe
```

가 아니다.

---

# 14. Vulnerability Engine

v0.1에서는 SBOM component를 OSV 데이터와 매칭한다.

Pipeline:

```text
SBOM
 ↓
Package URL / ecosystem+package+version
 ↓
OSV lookup
 ↓
CVE / advisory
 ↓
severity
 ↓
finding
```

그 후 CVE가 Known Exploited Vulnerability catalog 등에 포함되는지 enrichment할 수 있다.

중요:

> vulnerability 존재 ≠ CRA reportable event

ShipLedger는 자동으로 법률 판단하지 않는다.

---

# 15. Finding 상태

Finding 상태는 정확히 다음만 사용한다.

```text
OPEN

REVIEW_REQUIRED

FIXED

NOT_AFFECTED

RISK_ACCEPTED
```

AI가 새로운 상태를 만들지 못한다.

---

# 16. Risk Acceptance

위험을 무시할 때 그냥 Ignore를 누를 수 없다.

필수 입력:

```text
reason
approved_by
created_at
expiry
```

예:

```json
{
  "finding": "CVE-XXXX",
  "decision": "RISK_ACCEPTED",
  "reason": "Affected code path is unreachable",
  "approved_by": "...",
  "expires_at": "2026-11-01"
}
```

expiry가 지나면 자동으로:

```text
REVIEW_REQUIRED
```

로 돌아간다.

---

# 17. Policy Engine

Policy Engine은 deterministic해야 한다.

AI 결과로 PASS/BLOCK을 결정하지 않는다.

초기 Profile:

```text
baseline

cra-readiness
```

---

# 18. Baseline Policy

다음 evidence 검사:

```text
commit SHA available
release identity valid
artifact hashes available
tests available
SBOM available
vulnerability scan completed
```

결과 상태:

```text
READY

REVIEW_REQUIRED

INCOMPLETE
```

`COMPLIANT`라는 상태는 존재하면 안 된다.

---

# 19. CRA Readiness Profile

추가 정보:

```text
product name

product version

manufacturer

support period

security contact

CRA applicability status

technical documentation reference
```

Applicability:

```text
UNKNOWN
IN_SCOPE
OUT_OF_SCOPE
```

ShipLedger가 자동으로 `IN_SCOPE`를 결정하지 않는다.

사용자 또는 전문가가 결정한다.

---

# 20. Release Status State Machine

```text
COLLECTING
     │
     ▼
EVALUATING
     │
     ├───────────┐
     │           │
     ▼           ▼

INCOMPLETE   REVIEW_REQUIRED
     │           │
     └──────┬────┘
            │
         resolved
            │
            ▼
          READY
            │
            ▼
        APPROVED
            │
            ▼
        RELEASED
```

APPROVED는 Human Approval이 있을 때만 사용한다.

---

# 21. 절대로 자동 승인하지 않는다

다음 행동은 반드시 인간이 한다.

```text
Risk acceptance
Final release approval
CRA applicability declaration
Reportability decision
Incident awareness timestamp confirmation
ENISA submission
```

이는 Oruvena 원칙의

> AI는 적극적으로 준비하고 인간은 필요한 순간 개입한다

는 구조를 그대로 적용한다.

---

# 22. GitHub Action UX

사용자는 repo에:

```yaml
- uses: oruvena/shipledger@v1
  with:
    config: .shipledger.yml
```

만 추가하는 것을 목표로 한다.

---

# 23. `.shipledger.yml`

예:

```yaml
schema: 1

product:
  id: tobi
  name: Tobi

profile:
  type: baseline

evidence:
  sbom:
    path: ./sbom.cdx.json

  tests:
    junit:
      - ./reports/junit.xml

  artifacts:
    - ./dist/**/*.dmg
    - ./dist/**/*.zip

policy:
  vulnerability:
    block_critical: true
    review_high: true
    review_known_exploited: true

  risk_acceptance:
    max_expiry_days: 30

cloud:
  upload: false
```

CRA용:

```yaml
profile:
  type: cra-readiness

cra:
  applicability: unknown

  support_period:
    end: null

  security_contact: security@example.com
```

---

# 24. GitHub Job Summary

Action 실행 후 반드시 GitHub 화면에 summary를 출력한다.

예:

```text
ShipLedger

Tobi v0.8.3

Release Identity
✓ Commit pinned
✓ Artifact hashes generated

Tests
✓ 428 passed
✓ 0 failed

SBOM
✓ CycloneDX
✓ 384 components

Security
✓ 0 critical
⚠ 2 high
✓ 0 known exploited

Evidence
8 / 9 complete

STATUS

REVIEW REQUIRED
```

개발자가 별도 dashboard에 들어가지 않아도 즉시 가치가 있어야 한다.

---

# 25. GitHub Action Outputs

반드시 제공:

```text
status

evidence_path

evidence_digest

finding_count

critical_count

review_required
```

다른 workflow가 결과를 사용할 수 있게 한다.

---

# 26. Blocking은 기본적으로 OFF

초기 설치에서는 ShipLedger가 release를 막지 않는다.

Default:

```text
mode: advisory
```

사용자가 명시적으로:

```yaml
mode: enforce
```

를 설정해야 exit code 1로 pipeline을 차단할 수 있다.

AI 판단 때문에 CI를 실패시키면 안 된다.

---

# 27. Evidence Integrity

Evidence JSON을 deterministic serialization한다.

순서:

```text
Evidence Object
 ↓
Canonical JSON
 ↓
SHA-256
 ↓
evidence_digest
```

Evidence가 변경되면 digest가 반드시 바뀐다.

---

# 28. Evidence는 수정하지 않는다

Cloud에 올라간 Release Evidence는 append-only 방식으로 취급한다.

잘못된 내용이 있으면:

```text
Evidence v1
↓
Correction
↓
Evidence v2
```

를 생성한다.

기존 record 삭제/수정 금지.

---

# 29. Release Diff

이전 Release Evidence가 존재하면 비교한다.

```text
v0.8.2
 ↓
v0.8.3
```

비교 대상:

```text
dependencies added
dependencies removed
dependencies changed

artifacts

test counts

security findings

policy changes

support metadata
```

결과:

```text
Dependency changes

+ package-a 2.0
+ package-b 1.1

Updated

package-c
3.1 → 3.4

Security

- 2 vulnerabilities resolved
+ 1 vulnerability introduced
```

사용자가 모든 evidence를 다시 읽는 대신 **변화만 보게 한다.**

---

# 30. ShipLedger Cloud

첫 Cloud 화면은 5개만 만든다.

```text
Overview

Repositories

Releases

Findings

Settings
```

그 외 메뉴 만들지 않는다.

---

# 31. Overview 화면

예:

```text
Repositories           4

Active releases        7

Review required        2

Critical findings      0

Evidence completeness  94%
```

아래:

```text
Recent releases
```

table:

```text
Product
Version
Status
Findings
Evidence
Released
```

---

# 32. Repository Detail

```text
Tobi

Current release
v0.8.3

READY

Previous
v0.8.2

v0.8.1
...
```

---

# 33. Release Detail

가장 중요한 페이지.

구조:

```text
Tobi v0.8.3

READY

────────────────

Release

commit
tag
workflow
actor
timestamp

────────────────

Evidence

Source               ✓
Artifacts            ✓
Tests                ✓
SBOM                 ✓
Vulnerability scan   ✓
Risk review           ⚠

────────────────

Findings

2 HIGH

────────────────

Changes

2 dependencies added
1 removed

────────────────

Integrity

Evidence digest
...
```

---

# 34. Evidence Matrix

Release마다 matrix를 보여준다.

```text
Evidence               State       Source

Commit SHA             VERIFIED    GitHub

Build artifact hash    VERIFIED    Action

Test result             VERIFIED    JUnit

SBOM                    VERIFIED    CycloneDX

Vulnerability scan     VERIFIED    OSV

Risk decision           MISSING     Human
```

각 행은:

```text
누가 생성했는지
언제 생성했는지
원본 source가 무엇인지
```

알 수 있어야 한다.

---

# 35. Authentication

사람:

```text
Sign in with GitHub
```

사용.

Repo access:

GitHub App.

Personal Access Token 저장 방식은 사용하지 않는다.

---

# 36. GitHub Action → Cloud Authentication

최종 구조는 GitHub Actions OIDC를 사용한다.

workflow:

```yaml
permissions:
  contents: read
  id-token: write
```

Action:

```text
GitHub OIDC token 획득
↓
ShipLedger API
↓
JWT validation
↓
repository / SHA validation
↓
evidence upload
```

즉 사용자가 장기간 유지되는:

```text
SHIPLEDGER_API_SECRET
```

를 repo secret으로 넣지 않아도 되는 방향으로 만든다.

---

# 37. Cloud API

초기 API:

```text
POST /v1/evidence

GET /v1/repositories

GET /v1/repositories/:id/releases

GET /v1/releases/:id

GET /v1/releases/:id/evidence

POST /v1/findings/:id/decision

POST /v1/releases/:id/approve

GET /v1/health
```

모든 write는 audit event를 남긴다.

---

# 38. Database Core Tables

최소:

```text
users

organizations

organization_members

github_installations

repositories

products

releases

artifacts

evidence_bundles

sboms

components

vulnerabilities

findings

risk_decisions

approvals

audit_events
```

Phase 3 이후:

```text
incidents

incident_deadlines

incident_events

notification_drafts
```

---

# 39. Release Table 핵심 필드

```text
id

repository_id

product_id

version

commit_sha

tag

workflow_run_id

status

evidence_digest

created_at

released_at
```

unique constraint:

```text
repository_id
+
commit_sha
+
tag
```

---

# 40. Audit Event

사용자의 중요한 행동은 모두 남긴다.

```text
WHO

WHAT

RESOURCE

BEFORE

AFTER

WHEN
```

예:

```text
John
accepted risk
CVE-XXXX
2026-10-06 14:32 UTC
```

---

# 41. Background Vulnerability Monitoring

유료 Cloud의 핵심 기능.

Release 후에도 SBOM components를 모니터링한다.

```text
Released software
      │
      ▼
Stored SBOM
      │
      ▼

Daily vulnerability worker
      │
      ▼

new vulnerability?
     / \
   NO   YES
         │
         ▼

Affected release mapping
         │
         ▼

New Finding
```

---

# 42. 중요한 원칙

새 CVE가 발견되었다고:

```text
CRA REPORT REQUIRED
```

라고 표시하면 안 된다.

대신:

```text
POTENTIAL SECURITY EVENT

Human review required
```

이라고 한다.

---

# 43. Incident Workspace

Phase 4.

사용자가 finding을 확인하여:

```text
Open Incident
```

선택.

Incident type:

```text
ACTIVELY_EXPLOITED_VULNERABILITY

SEVERE_SECURITY_INCIDENT

OTHER
```

---

# 44. Awareness Time

중요.

Scanner 발견 시간이 자동으로 법률상 awareness 시간이 되는 것으로 단정하지 않는다.

화면:

```text
Detected

2026-10-06 09:21 UTC


Confirm awareness time

[ 2026-10-06 10:15 UTC ]


This timestamp affects reporting deadlines.
Confirm only after responsible review.
```

Human confirmation 필수.

---

# 45. CRA Incident Timer

확인 후:

```text
CRA Incident

Awareness
10:15 UTC

24h Early Warning
13h 42m remaining

72h Notification
61h 42m remaining
```

Article 14 보고 흐름상 현재 24h / 72h deadlines가 존재한다.

---

# 46. ENISA 연동

v1에서는 직접 제출 자동화하지 않는다.

ENISA SRP는 현재 제조자가 신고하는 실제 공식 플랫폼이다.

ShipLedger v1은:

```text
prepare
validate
export
```

까지만 한다.

예:

```text
CRA Notification Draft

Product
Affected versions
Vulnerability
Impact
Mitigation
Timeline
Contact
```

사람이 검토한 뒤 공식 SRP에 제출한다.

---

# 47. AI 사용 원칙

v0.1:

**AI 사용하지 않는다.**

이것은 중요하다.

핵심 Engine은:

```text
deterministic
reproducible
explainable
```

해야 한다.

---

# 48. AI를 나중에 쓸 위치

AI는 다음 작업에만 사용 가능하다.

```text
Finding 설명

Dependency change 요약

Risk review 초안

Incident timeline 요약

CRA notification draft

Technical documentation draft
```

AI는 절대로:

```text
PASS
BLOCK
COMPLIANT
REPORTABLE
```

를 최종 결정할 수 없다.

---

# 49. Security Model

ShipLedger 자체가 security product이므로 이 부분은 타협하지 않는다.

원칙:

```text
minimum GitHub permissions

no source retention

no shell interpolation of untrusted input

input size limits

path traversal protection

JSON schema validation

tenant isolation

audit logging

encrypted secrets

short-lived credentials

rate limiting

CSRF protection

secure cookies
```

---

# 50. GitHub Permissions

가능한 최소 권한부터 시작한다.

대략:

```text
Metadata: Read

Contents: Read

Actions: Read

Releases: Read
```

필요할 때만:

```text
Checks: Write
```

추가.

Admin 권한 요구 금지.

---

# 51. Privacy

Cloud에 원칙적으로 저장하지 않는다:

```text
raw repository source

environment variables

GitHub secrets

build credentials

private key

full workflow environment dumps
```

---

# 52. Fail-Safe Rule

데이터가 없으면:

```text
UNKNOWN
```

이다.

절대:

```text
PASS
```

가 아니다.

예:

SBOM 다운로드 실패.

결과:

```text
SBOM

INCOMPLETE
```

이지:

```text
No vulnerabilities ✓
```

가 아니다.

---

# 53. Open-source 전략

Open Engine은 무료 공개하는 것이 좋다.

이유:

```text
Trust

Developer adoption

GitHub discovery

Security review

Distribution
```

고객은 evidence를 만드는 코드 자체를 볼 수 있다.

Cloud에서 돈을 받는다.

---

# 54. Monetization

## Free

```text
Local evidence bundle

GitHub summary

SBOM parsing

Basic vulnerability findings

Release diff
```

---

## Indie — 약 €29/month

```text
3 repositories

Evidence Vault

Release history

Continuous vulnerability monitoring
```

---

## Startup — 약 €79/month

```text
10 repositories

Risk decisions

Approvals

Incident workspace

CRA evidence export
```

---

## Team — 약 €199/month

```text
Organization controls

Roles

Advanced retention

Audit export

API
```

가격은 초기 검증에 따라 변경 가능.

---

# 55. North Star Metric

초기에는 매출보다 다음을 본다.

```text
Protected Active Repositories
```

정의:

최근 30일 안에 ShipLedger Evidence를 2회 이상 생성한 repository.

---

# 56. Activation

사용자가:

```text
설치
↓
첫 workflow 실행
↓
Evidence 생성
```

까지 10분 이하를 목표로 한다.

Oruvena 원칙상 Time-to-Value는 몇 분 안에 보여야 한다.

---

# 57. Phase 0 — Oruvena Internal Prototype

가장 먼저 이것부터 만든다.

Cloud 금지.

Dashboard 금지.

Billing 금지.

목표:

```text
Oruvena repo 하나
↓
GitHub Action
↓
shipledger-evidence.json
↓
GitHub summary
```

지원:

```text
commit SHA

tag

artifact hash

test report

SBOM import

OSV finding

evidence digest
```

---

# 58. Phase 0 Definition of Done

다음이 전부 작동해야 끝이다.

```text
Real GitHub repository에서 실행

Evidence JSON 생성

Evidence Markdown 생성

SHA-256 digest 생성

GitHub Summary 표시

잘못된 SBOM 처리

누락된 test report 처리

API failure 처리

같은 입력 → 같은 normalized evidence

Unit test 존재
```

---

# 59. Phase 1 — Public Action

Phase 0을 실제로 사용해 본 후 공개.

추가:

```text
action.yml

README

quickstart

example project

Marketplace metadata

version tags

security policy

issue templates
```

GitHub Marketplace의 Action은 public repository와 root `action.yml` 또는 `action.yaml` 등의 요건을 맞춰 공개할 수 있다.

---

# 60. Phase 1 성공 기준

30일:

```text
100 installations
```

또는

```text
20 active repositories
```

둘 다 실패한다면 Cloud 개발을 재검토한다.

---

# 61. Phase 2 — Cloud Evidence Vault

그 다음에만 SaaS 개발.

구현:

```text
GitHub login

GitHub App

Repository connect

OIDC evidence upload

Repository dashboard

Release dashboard

Evidence viewer

Release history
```

Billing은 마지막.

---

# 62. Phase 3 — Continuous Monitoring

Cloud에 저장된 SBOM을 바탕으로:

```text
daily OSV check

new vulnerability mapping

release impact mapping

finding creation

email notification
```

추가.

---

# 63. Phase 4 — CRA Incident Workflow

추가:

```text
incident

awareness confirmation

24h timer

72h timer

evidence bundle

notification draft

incident history
```

---

# 64. Phase 5 — Agent Era

CRA product에서 벗어나기 시작한다.

추가 evidence:

```text
AI agent identity

agent-created PR

model/provider metadata

agent tool actions

human approval

deployment authority
```

예:

```text
Codex created change

Claude reviewed

CI passed

Human approved

ShipLedger verified evidence

Production deployed
```

이 시점부터 ShipLedger는:

> CRA Tool

이 아니라

> **AI Software Release Trust Layer**

가 된다.

---

# 65. UX 철학

화면에 정보가 많아서는 안 된다.

최상단에서 사용자가 알아야 하는 것은 항상 하나다.

```text
READY
```

또는:

```text
REVIEW REQUIRED
```

또는:

```text
INCOMPLETE
```

그 아래 이유를 보여준다.

---

# 66. 사용자의 행동을 줄인다

나쁜 UX:

```text
Dashboard
→ Security
→ Dependencies
→ Scanner
→ Filters
→ CVEs
→ Reports
```

좋은 UX:

```text
Release v0.8.3

REVIEW REQUIRED

Why?

1 High vulnerability
Risk decision required

[Review]
```

Oruvena 제품은 기능보다 사용자의 판단을 줄여야 한다.

---

# 67. 테스트 전략

반드시 작성:

## Core

```text
evidence normalization

canonical JSON

hash generation

policy evaluation

state machine
```

## Parsers

fixtures:

```text
valid CycloneDX

invalid CycloneDX

valid SPDX

JUnit

empty reports

oversized report
```

## Vulnerability

```text
OSV success

OSV timeout

unknown package

multiple CVEs

duplicate CVEs
```

## Security

```text
path traversal

malformed JSON

untrusted filename

huge file

HTML injection

cross-tenant access
```

---

# 68. E2E 테스트

샘플 repository를 만든다.

```text
examples/demo-node-app
```

Scenario A:

```text
Clean release
→ READY
```

Scenario B:

```text
SBOM missing
→ INCOMPLETE
```

Scenario C:

```text
Critical vulnerability
→ REVIEW_REQUIRED
```

Scenario D:

```text
Risk accepted
→ READY
```

Scenario E:

```text
Acceptance expired
→ REVIEW_REQUIRED
```

---

# 69. Observability

Cloud 자체도 기록한다.

```text
API latency

worker failures

evidence ingestion failures

GitHub webhook failures

OSV failures

notification failures
```

Sentry 또는 동등한 error monitoring 사용 가능.

---

# 70. Analytics

제품 analytics는 최소한:

```text
action_install

first_evidence_generated

evidence_generated

cloud_connected

finding_created

finding_reviewed

release_approved

monitoring_alert

incident_opened

paid_conversion
```

Source code나 취약한 데이터는 analytics로 보내지 않는다.

---

# 71. 첫 번째 Oruvena 내부 적용

처음에는 Oruvena project 하나에 적용한다.

조건:

```text
CI가 안정적으로 존재

실제 release가 반복

artifact 또는 deploy version이 명확
```

첫 한 달은 실제 사용만 관찰한다.

특히 측정:

```text
Evidence 파일을 실제 보는가?

Release diff가 유용한가?

어떤 evidence가 전혀 사용되지 않는가?

어떤 finding이 noise인가?

취약점 → 영향 release 연결이 유용한가?
```

---

# 72. Kill Rule

Oruvena 내부에서도 한 달 사용 후:

```text
전혀 확인하지 않는다

없어도 release에 불편함이 없다

release 상태 파악에 도움 안 된다
```

면 기능을 늘리지 않는다.

제품 가정을 다시 검토한다.

---

# 73. 개발 Agent 행동 규칙

Antigravity/Codex는 새 기능을 임의로 추가하지 않는다.

모든 변경 전에 묻는다.

```text
이것이 Release Evidence에 필요한가?

Release 판단을 줄이는가?

Evidence 신뢰도를 높이는가?

CRA wedge 또는 향후 release trust layer와 연결되는가?
```

아니면 구현하지 않는다.

---

# 74. 특히 구현 금지

명시적 지시 없이는 다음 기능을 만들지 마라.

```text
Chatbot

AI agent orchestration

Project management

Issue tracker

Deployment hosting

Source code editor

Generic vulnerability scanner

Generic observability

Generic CI dashboard

Team chat

Documentation wiki
```

---

# 75. 데이터 손실 원칙

Evidence 저장 실패 시 release evidence가 생성됐다고 표시하지 않는다.

Local evidence 생성 성공 + Cloud upload 실패인 경우:

```text
LOCAL EVIDENCE READY

CLOUD SYNC FAILED
```

두 상태를 분리한다.

---

# 76. Migration 원칙

Evidence schema는 versioned.

```text
shipledger.evidence.v1
```

새 schema가 생겨도 과거 evidence를 수정하지 않는다.

Reader가 이전 schema를 읽는다.

---

# 77. Definition of Done

기능이 동작한다고 완료가 아니다.

완료 조건:

```text
happy path

failure path

test

security review

empty/loading/error states

telemetry

documentation

backward compatibility consideration
```

그리고 중요한 결과에는 항상:

```text
Source

Timestamp

Reason
```

이 존재해야 한다.

이는 Oruvena의 Definition of Done 원칙과 맞는다.

---

# 78. 최종 Product Boundary

ShipLedger의 핵심은 이것이다.

```text
COLLECT

VERIFY

RECORD

MONITOR

ESCALATE
```

그 이상을 하지 않는다.

---

# 79. 장기 Architecture

```text
          Humans

            │

        AI Agents

            │
            ▼

      Code / Changes

            │
            ▼

        CI / Build

            │
            ▼

   ┌──────────────────┐
   │                  │
   │    SHIPLEDGER    │
   │                  │
   │ Identity         │
   │ Evidence         │
   │ Policy           │
   │ Approval         │
   │ Monitoring       │
   │ Incident         │
   │                  │
   └────────┬─────────┘

            │
            ▼

     Verified Release

            │
            ▼

        Real World
```

---

# 80. North Star

ShipLedger는 개발자를 더 바쁘게 만드는 compliance software가 되어서는 안 된다.

좋은 상태는:

```text
Developer ships normally.

ShipLedger watches quietly.

Only meaningful problems interrupt the human.
```

이다.

즉:

> **개발자는 평소대로 배포한다.**

> **ShipLedger는 뒤에서 증거를 남긴다.**

> **사람의 판단이 필요한 순간에만 끼어든다.**

---

# FINAL PRODUCT RULE

ShipLedger는 규정을 설명하는 제품이 아니다.

**릴리즈를 증명 가능한 사건으로 만드는 제품이다.**

Scanner를 만들지 마라.

**Scanner의 결과를 의사결정과 증거로 연결하라.**

AI에게 최종 판단시키지 마라.

**AI는 증거를 이해하는 데 사용하고 결정은 deterministic rule과 인간에게 남겨라.**

CRA에 갇히지 마라.

**CRA는 첫 번째 고객을 얻기 위한 Wedge다.**

최종적으로 ShipLedger가 차지해야 할 위치는:

> **Software가 현실 세계에 나가기 직전에 통과하는 Evidence & Trust Layer.**

그리고 AI가 더 많은 코드를 만들수록,

이 Layer의 필요성은 더 커져야 한다.
