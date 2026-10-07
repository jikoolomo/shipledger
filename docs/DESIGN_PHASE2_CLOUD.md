# ShipLedger Cloud (Phase 2) Architecture & Design Specification

> **Company:** Oruvena  
> **Product:** ShipLedger Cloud (`shipledger.oruvena.com`)  
> **Repository:** `oruvena/shipledger-cloud` (or Monorepo workspace `apps/web`, `packages/db`)  
> **Target Wedge:** Release Evidence Vault & Continuous CRA Readiness Layer  

---

## 1. Cloud 아키텍처 개요

ShipLedger Cloud는 무료 오픈 엔진(`ShipLedger Action & CLI`)의 결과를 수집·확장하여 **장기 보관(Vault), 모니터링, 인간 승인 및 감사 추적**을 제공하는 유료 SaaS 레이어입니다.

```text
       GitHub Actions Workflow
                  │
        (GitHub OIDC Token)
                  │
                  ▼
      ┌──────────────────────┐
      │  POST /v1/evidence   │
      └──────────┬───────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │   OIDC JWT Verifier   │ (iss: token.actions.githubusercontent.com)
     └──────────┬────────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │   Evidence Ingestion  │ (Append-Only Evidence Vault)
     └──────────┬────────────┘
                 │
     ┌───────────┴───────────┐
     ▼                       ▼
 PostgreSQL              S3 Compatible
 (Drizzle ORM)         (Raw Evidence Bundles)
     │
     ▼
 ┌───────────────────────┐
 │ Next.js App Router UI │ (Overview, Repos, Releases, Findings, Settings)
 └───────────────────────┘
     ▲
     │ (Daily Cron Worker)
 ┌───────────────────────┐
 │ Continuous OSV Worker │ (New CVEs -> Affected Release Mapping)
 └───────────────────────┘
```

---

## 2. 핵심 데이터베이스 스키마 설계 (PostgreSQL + Drizzle ORM)

기획서 §38, §39, §40에 정의된 코어 테이블 구조:

### 2.1 조직 및 인증
- **`users`**: `id`, `github_id`, `email`, `name`, `avatar_url`, `created_at`
- **`organizations`**: `id`, `slug`, `name`, `tier` (`free`, `indie`, `startup`, `team`), `created_at`
- **`organization_members`**: `id`, `organization_id`, `user_id`, `role` (`owner`, `admin`, `member`), `created_at`
- **`github_installations`**: `id`, `organization_id`, `installation_id`, `account_login`, `created_at`

### 2.2 저장소 및 릴리즈 (Release Identity)
- **`repositories`**: `id`, `organization_id`, `github_repo_id`, `owner`, `name`, `default_branch`, `created_at`
- **`products`**: `id`, `organization_id`, `slug`, `name`, `manufacturer`, `cra_applicability` (`UNKNOWN`, `IN_SCOPE`, `OUT_OF_SCOPE`)
- **`releases`** (기획서 §39 핵심 테이블):
  - `id`: UUID (PK)
  - `repository_id`: FK -> `repositories.id`
  - `product_id`: FK -> `products.id`
  - `version`: string (e.g. `v0.8.3` or `0.8.3`)
  - `commit_sha`: string(40) (Immutable commit pointer)
  - `tag`: string (nullable)
  - `workflow_run_id`: string (GitHub Action run ID)
  - `status`: enum (`INCOMPLETE`, `REVIEW_REQUIRED`, `READY`, `APPROVED`, `RELEASED`)
  - `evidence_digest`: string(64) (Canonical JSON SHA-256 digest)
  - `created_at`: timestamp
  - `released_at`: timestamp (nullable)
  - **Unique Constraint:** `(repository_id, commit_sha, tag)`

### 2.3 증거 및 아티팩트 (Evidence Vault)
- **`evidence_bundles`**: `id`, `release_id`, `schema_version`, `raw_bundle_json` (JSONB), `digest`, `s3_uri`, `created_at`
- **`artifacts`**: `id`, `release_id`, `name`, `path`, `sha256`, `size_bytes`, `created_at`
- **`sboms`**: `id`, `release_id`, `format` (`CycloneDX`, `SPDX`), `spec_version`, `sha256`, `component_count`, `created_at`
- **`components`**: `id`, `sbom_id`, `name`, `version`, `purl`, `type`, `license`

### 2.4 취약점 및 위험 수용 (Vulnerability & Findings)
- **`vulnerabilities`**: `id` (e.g. `CVE-2024-XXXX`), `summary`, `details`, `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), `known_exploited` (boolean), `discovered_at`
- **`findings`**:
  - `id`: UUID (PK)
  - `release_id`: FK -> `releases.id`
  - `vulnerability_id`: FK -> `vulnerabilities.id`
  - `component_id`: FK -> `components.id`
  - `status`: enum (`OPEN`, `REVIEW_REQUIRED`, `FIXED`, `NOT_AFFECTED`, `RISK_ACCEPTED`)
- **`risk_decisions`** (기획서 §16 필수 Audit):
  - `id`: UUID (PK)
  - `finding_id`: FK -> `findings.id`
  - `reason`: text (필수 입력 사유)
  - `approved_by_user_id`: FK -> `users.id`
  - `created_at`: timestamp
  - `expires_at`: timestamp (만료 시 자동으로 REVIEW_REQUIRED 회귀)
- **`approvals`** (기획서 §20, §21 인간 최종 승인):
  - `id`: UUID (PK)
  - `release_id`: FK -> `releases.id`
  - `approved_by_user_id`: FK -> `users.id`
  - `comment`: text
  - `created_at`: timestamp

### 2.5 감사 로그 (Audit Events - 기획서 §40)
- **`audit_events`**:
  - `id`: UUID (PK)
  - `organization_id`: FK -> `organizations.id`
  - `actor_user_id`: FK -> `users.id` (nullable for system events)
  - `action`: string (e.g. `risk_accepted`, `release_approved`, `evidence_uploaded`)
  - `resource_type`: string (`finding`, `release`, `policy`)
  - `resource_id`: string
  - `before_state`: JSONB
  - `after_state`: JSONB
  - `timestamp`: timestamp

---

## 3. GitHub Actions OIDC 무패스워드 업로드 파이프라인

기획서 §36에 따라, 영구 API Key 대신 GitHub Actions의 임시 OIDC 토큰을 검증합니다.

```yaml
# GitHub Actions 설정
permissions:
  id-token: write
  contents: read

steps:
  - uses: oruvena/shipledger@v1
    with:
      config: .shipledger.yml
      cloud_upload: true
```

### OIDC 검증 흐름:
1. GitHub Action이 `core.getIDToken("https://shipledger.oruvena.com")` 호출
2. Cloud API `POST /v1/evidence`로 토큰과 `shipledger-evidence.json` 전송
3. Cloud 서버 검증:
   - `iss === "https://token.actions.githubusercontent.com"`
   - `aud === "https://shipledger.oruvena.com"`
   - `claims.repository === evidence.release.repository`
   - `claims.sha === evidence.release.commit_sha`
4. 검증 통과 시 `releases` 및 `evidence_bundles`에 Append-Only 저장.

---

## 4. 첫 번째 Cloud 5대 화면 (기획서 §30~§34)

사용자의 행동과 판단을 최소화하는 UX 철학(기획서 §65, §66):

1. **Overview (`/`)**:
   - 상단 메트릭: Repositories | Active Releases | Review Required | Critical Findings | Completeness (94%)
   - 최근 릴리즈 테이블: Product, Version, Status (`READY` / `REVIEW REQUIRED`), Findings, Evidence, Released Date
2. **Repositories (`/repositories`)**:
   - 연결된 저장소 카드 (Tovi, Build SaaS 등)
   - 최신 릴리즈 상태 및 브랜치 정보
3. **Releases (`/releases/:id`) — 가장 중요한 페이지**:
   - 상단 대형 뱃지: 🟢 **`READY`** / 🟡 **`REVIEW REQUIRED`** / 🔴 **`INCOMPLETE`**
   - **Release Identity**: Commit SHA, Tag, Workflow, Actor, Timestamp
   - **Evidence Matrix**: Commit (VERIFIED), Artifacts (VERIFIED), Tests (VERIFIED), SBOM (VERIFIED), OSV (VERIFIED), Risk Review (STATUS)
   - **Findings**: 취약점 목록 및 1-클릭 검토 모달 (`[Accept Risk]`, 사유/승인자/만료일 필수)
   - **Changes (Diff)**: 직전 릴리즈 대비 종속성 및 취약점 변화
   - **Integrity**: Evidence SHA-256 Digest 및 원본 JSON 다운로드
4. **Findings (`/findings`)**:
   - 전체 조직 단위 미해결 취약점 필터 및 위험 수용 만료 임박 목록
5. **Settings (`/settings`)**:
   - GitHub App 설치 관리, 조직 멤버 및 권한, CRA 기본 연락처 정보

---

## 5. 지속적 취약점 모니터링 워커 (Phase 3 연계)

- 일일 백그라운드 워커(PostgreSQL 기반 큐 or Cron)가 저장된 모든 최신 활성 릴리즈의 `sboms -> components`를 OSV API로 재스캔
- 신규 발견 시 `POTENTIAL SECURITY EVENT: Human review required` 알림 발행 (자동 보고서 작성 금지).
